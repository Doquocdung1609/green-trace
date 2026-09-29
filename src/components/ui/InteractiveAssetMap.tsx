import { AlertTriangle, LocateFixed, MapPin, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import * as trackasiagl from "trackasia-gl";
import "trackasia-gl/dist/trackasia-gl.css";
import { config } from "../../lib/config";

const TRACK_ASIA_BASE_URL = "https://maps.track-asia.com";
const DEFAULT_CENTER: [number, number] = [108.0089, 15.2853];

interface PlaceSuggestion {
  description?: string;
  place_id?: string;
  terms?: Array<{ value?: string }>;
}

interface AutocompleteResponse {
  status?: string;
  predictions?: PlaceSuggestion[];
  error_message?: string;
}

interface TextSearchResponse {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
  error_message?: string;
}

interface InteractiveAssetMapProps {
  region: string;
  latitude?: number;
  longitude?: number;
  onRegionChange: (region: string) => void;
  onCoordinatesChange: (latitude?: number, longitude?: number) => void;
}

function isValidCoordinate(latitude?: number, longitude?: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude! >= -90 && latitude! <= 90 && longitude! >= -180 && longitude! <= 180;
}

function getSuggestionLabel(suggestion: PlaceSuggestion) {
  return suggestion.description || suggestion.terms?.map((term) => term.value).filter(Boolean).join(", ") || "Địa điểm không tên";
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

export function InteractiveAssetMap({
  region,
  latitude,
  longitude,
  onRegionChange,
  onCoordinatesChange,
}: InteractiveAssetMapProps) {
  const listboxId = useId();
  const token = config.trackAsiaToken.trim();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<trackasiagl.Map | null>(null);
  const markerRef = useRef<trackasiagl.Marker | null>(null);
  const autocompleteTimerRef = useRef<number | null>(null);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const initialCoordinatesRef = useRef({ latitude, longitude });
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const onRegionChangeRef = useRef(onRegionChange);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchQuery, setSearchQuery] = useState(region);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  onCoordinatesChangeRef.current = onCoordinatesChange;
  onRegionChangeRef.current = onRegionChange;

  const placeMarker = useCallback((nextLatitude: number, nextLongitude: number, moveCamera = true) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      const marker = new trackasiagl.Marker({ color: "#087b55", draggable: true })
        .setLngLat([nextLongitude, nextLatitude])
        .addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLngLat();
        onCoordinatesChangeRef.current(roundCoordinate(position.lat), roundCoordinate(position.lng));
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([nextLongitude, nextLatitude]);
    }
    if (moveCamera) {
      map.easeTo({ center: [nextLongitude, nextLatitude], zoom: Math.max(map.getZoom(), 13), duration: 650 });
    }
  }, []);

  useEffect(() => {
    if (!token || !mapContainerRef.current || mapRef.current) return;
    const initialCoordinates = initialCoordinatesRef.current;
    const hasInitialPosition = isValidCoordinate(initialCoordinates.latitude, initialCoordinates.longitude);
    try {
      const map = new trackasiagl.Map({
        container: mapContainerRef.current,
        style: `${TRACK_ASIA_BASE_URL}/styles/v2/streets.json?key=${encodeURIComponent(token)}`,
        center: hasInitialPosition ? [initialCoordinates.longitude!, initialCoordinates.latitude!] : DEFAULT_CENTER,
        zoom: hasInitialPosition ? 13 : 5.5,
      });
      mapRef.current = map;
      map.addControl(new trackasiagl.NavigationControl({ showCompass: true }), "top-right");

      const handleLoad = () => {
        setMapReady(true);
        setMapError("");
        map.resize();
      };
      const handleClick = (event: trackasiagl.MapMouseEvent) => {
        const nextLatitude = roundCoordinate(event.lngLat.lat);
        const nextLongitude = roundCoordinate(event.lngLat.lng);
        placeMarker(nextLatitude, nextLongitude);
        onCoordinatesChangeRef.current(nextLatitude, nextLongitude);
      };
      const handleError = (event: trackasiagl.ErrorEvent) => {
        setMapError(event.error?.message || "TrackAsia không thể tải dữ liệu bản đồ.");
      };
      map.on("load", handleLoad);
      map.on("click", handleClick);
      map.on("error", handleError);

      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        if (autocompleteTimerRef.current !== null) window.clearTimeout(autocompleteTimerRef.current);
        autocompleteAbortRef.current?.abort();
        searchAbortRef.current?.abort();
        resizeObserver.disconnect();
        markerRef.current?.remove();
        markerRef.current = null;
        map.off("load", handleLoad);
        map.off("click", handleClick);
        map.off("error", handleError);
        map.remove();
        mapRef.current = null;
      };
    } catch (reason) {
      setMapError(reason instanceof Error ? reason.message : "Không thể khởi tạo bản đồ TrackAsia.");
    }
  }, [placeMarker, token]);

  useEffect(() => {
    if (!mapReady || !isValidCoordinate(latitude, longitude)) return;
    placeMarker(latitude!, longitude!);
  }, [latitude, longitude, mapReady, placeMarker]);

  const requestAutocomplete = (value: string) => {
    if (autocompleteTimerRef.current !== null) window.clearTimeout(autocompleteTimerRef.current);
    autocompleteAbortRef.current?.abort();
    const query = value.trim();
    if (!token || query.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setAutocompleteLoading(false);
      return;
    }
    setAutocompleteLoading(true);
    autocompleteTimerRef.current = window.setTimeout(async () => {
      autocompleteTimerRef.current = null;
      const controller = new AbortController();
      autocompleteAbortRef.current = controller;
      try {
        const params = new URLSearchParams({ input: query, key: token, size: "8", location: "15.2853,108.0089", language: "vi" });
        const response = await fetch(`${TRACK_ASIA_BASE_URL}/api/v2/place/autocomplete/json?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`TrackAsia autocomplete trả về HTTP ${response.status}.`);
        const payload = await response.json() as AutocompleteResponse;
        if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") throw new Error(payload.error_message || `TrackAsia autocomplete: ${payload.status || "phản hồi không hợp lệ"}.`);
        const nextSuggestions = payload.predictions ?? [];
        setSuggestions(nextSuggestions);
        setActiveSuggestion(-1);
        setSuggestionsOpen(nextSuggestions.length > 0);
        setSearchError(nextSuggestions.length ? "" : "Không tìm thấy gợi ý phù hợp.");
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestionsOpen(false);
          setSearchError(reason instanceof Error ? reason.message : "Không thể tải gợi ý TrackAsia.");
        }
      } finally {
        if (!controller.signal.aborted) setAutocompleteLoading(false);
      }
    }, 350);
  };

  const searchLocation = async (query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !token) return;
    if (autocompleteTimerRef.current !== null) {
      window.clearTimeout(autocompleteTimerRef.current);
      autocompleteTimerRef.current = null;
    }
    autocompleteAbortRef.current?.abort();
    setAutocompleteLoading(false);
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setSearchError("");
    setSuggestionsOpen(false);
    try {
      const params = new URLSearchParams({ query: normalizedQuery, key: token, language: "vi", location: "15.2853,108.0089" });
      const response = await fetch(`${TRACK_ASIA_BASE_URL}/api/v2/place/textsearch/json?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`TrackAsia text search trả về HTTP ${response.status}.`);
      const payload = await response.json() as TextSearchResponse;
      if (payload.status !== "OK" || !payload.results?.length) throw new Error(payload.error_message || "Không tìm thấy địa điểm phù hợp.");
      const bestResult = payload.results[0];
      const nextLatitude = Number(bestResult.geometry?.location?.lat);
      const nextLongitude = Number(bestResult.geometry?.location?.lng);
      if (!isValidCoordinate(nextLatitude, nextLongitude)) throw new Error("TrackAsia không trả về tọa độ hợp lệ.");
      const formattedAddress = bestResult.formatted_address || normalizedQuery;
      setSearchQuery(formattedAddress);
      setSuggestions([]);
      onRegionChangeRef.current(formattedAddress);
      onCoordinatesChangeRef.current(roundCoordinate(nextLatitude), roundCoordinate(nextLongitude));
      placeMarker(nextLatitude, nextLongitude);
    } catch (reason) {
      if ((reason as Error).name !== "AbortError") {
        setSearchError(reason instanceof Error ? reason.message : "Không thể tìm địa điểm trên TrackAsia.");
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  };

  const chooseSuggestion = (suggestion: PlaceSuggestion) => {
    const label = getSuggestionLabel(suggestion);
    setSearchQuery(label);
    setSuggestionsOpen(false);
    setSuggestions([]);
    void searchLocation(label);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionsOpen && activeSuggestion >= 0 && suggestions[activeSuggestion]) chooseSuggestion(suggestions[activeSuggestion]);
      else void searchLocation(searchQuery);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
    }
  };

  const recenter = () => {
    if (isValidCoordinate(latitude, longitude)) placeMarker(latitude!, longitude!);
  };

  const resetLocation = () => {
    if (autocompleteTimerRef.current !== null) {
      window.clearTimeout(autocompleteTimerRef.current);
      autocompleteTimerRef.current = null;
    }
    autocompleteAbortRef.current?.abort();
    searchAbortRef.current?.abort();
    markerRef.current?.remove();
    markerRef.current = null;
    setSearchQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    setSearchError("");
    setAutocompleteLoading(false);
    setIsSearching(false);
    onRegionChangeRef.current("");
    onCoordinatesChangeRef.current(undefined, undefined);
    mapRef.current?.easeTo({ center: DEFAULT_CENTER, zoom: 5.5, duration: 650 });
  };

  if (!token) {
    return <section className="map-card map-error-state" role="alert"><AlertTriangle size={28} /><div><strong>Thiếu cấu hình TrackAsia</strong><p>Thêm `VITE_TRACK_ASIA_ACCESS_TOKEN` vào biến môi trường rồi khởi động lại ứng dụng.</p></div></section>;
  }

  return (
    <section className="map-card interactive-map" aria-label="Bản đồ chọn vị trí tài sản">
      <div className="map-search">
        <label htmlFor={`${listboxId}-input`}>Tìm địa chỉ hoặc khu vực</label>
        <div className="map-search-control">
          <Search size={18} aria-hidden="true" />
          <input
            id={`${listboxId}-input`}
            type="search"
            value={searchQuery}
            placeholder="Nam Trà My, Quảng Nam"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={suggestionsOpen}
            aria-activedescendant={activeSuggestion >= 0 ? `${listboxId}-${activeSuggestion}` : undefined}
            onChange={(event) => {
              const value = event.target.value;
              setSearchQuery(value);
              setSearchError("");
              requestAutocomplete(value);
            }}
            onFocus={() => setSuggestionsOpen(suggestions.length > 0)}
            onBlur={() => setSuggestionsOpen(false)}
            onKeyDown={handleSearchKeyDown}
          />
          <button type="button" onClick={() => void searchLocation(searchQuery)} disabled={isSearching || !searchQuery.trim()}>{isSearching ? "Đang tìm…" : "Tìm"}</button>
        </div>
        {autocompleteLoading ? <span className="map-search-loading" role="status">Đang tải gợi ý…</span> : null}
        {suggestionsOpen && suggestions.length ? <ul id={listboxId} className="map-suggestions" role="listbox">
          {suggestions.map((suggestion, index) => <li key={suggestion.place_id || `${getSuggestionLabel(suggestion)}-${index}`}>
            <button
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeSuggestion === index}
              className={activeSuggestion === index ? "active" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
              onMouseEnter={() => setActiveSuggestion(index)}
            ><MapPin size={16} aria-hidden="true" /><span>{getSuggestionLabel(suggestion)}</span></button>
          </li>)}
        </ul> : null}
        {searchError ? <p className="map-search-error" role="alert">{searchError}</p> : null}
      </div>
      <div className="interactive-map-frame">
        <div ref={mapContainerRef} className="interactive-map-canvas" aria-label="Nhấp hoặc kéo marker để chọn tọa độ" />
        {!mapReady && !mapError ? <div className="map-loading" role="status">Đang tải bản đồ TrackAsia…</div> : null}
        {mapError ? <div className="map-error-overlay" role="alert"><AlertTriangle size={22} /><span>{mapError}</span></div> : null}
        <div className="map-floating-actions">
          <button type="button" onClick={recenter} disabled={!isValidCoordinate(latitude, longitude)} title="Về vị trí đã chọn"><LocateFixed size={17} /><span>Về vị trí đã chọn</span></button>
          <button type="button" onClick={resetLocation} disabled={!region && !isValidCoordinate(latitude, longitude)} title="Đặt lại vị trí"><RotateCcw size={17} /><span>Đặt lại</span></button>
        </div>
      </div>
      <div className="map-details" aria-live="polite">
        <strong>Vị trí đã chọn</strong>
        <span>{region || "Chưa chọn khu vực"}</span>
        <span>{isValidCoordinate(latitude, longitude) ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)} (WGS84)` : "Tìm kiếm, nhấp bản đồ hoặc nhập tọa độ để chọn vị trí."}</span>
      </div>
    </section>
  );
}

export default InteractiveAssetMap;
