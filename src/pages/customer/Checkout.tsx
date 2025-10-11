import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import ToastNotification from "../../components/ui/ToastNotification";
import { fetchProducts, addOrder } from "../../services/api";
import { v4 as uuidv4 } from "uuid";
import trackasiagl from "trackasia-gl";
import type { Product, Order } from "../../types/types";

// Define schema
const schema = z.object({
  name: z.string().min(1, "Nhập họ tên"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Nhập số điện thoại hợp lệ"),
  address: z.string().min(1, "Nhập địa chỉ giao hàng"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  payment: z.enum(["cod", "solana"]),
});

type FormData = z.infer<typeof schema>;

const TRACK_ASIA_ACCESS_TOKEN = import.meta.env.VITE_TRACK_ASIA_ACCESS_TOKEN || "e7e09d5a3e76bc8e71760189816caff185";

const Checkout = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<trackasiagl.Map | null>(null);
  const markerRef = useRef<trackasiagl.Marker | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      payment: "cod",
    },
  });

  // Define pulsing dot with explicit context type
  const size = 200;
  const pulsingDot: {
    width: number;
    height: number;
    data: Uint8Array;
    context?: CanvasRenderingContext2D | null;
    onAdd: () => void;
    render: () => boolean;
  } = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    context: null,

    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext("2d");
    },

    render() {
      const duration = 1000;
      const t = (performance.now() % duration) / duration;

      const radius = (size / 2) * 0.3;
      const outerRadius = (size / 2) * 0.7 * t + radius;
      if (!this.context) return false;

      // Draw outer circle
      this.context.clearRect(0, 0, this.width, this.height);
      this.context.beginPath();
      this.context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
      this.context.fillStyle = `rgba(255, 200, 200,${1 - t})`;
      this.context.fill();

      // Draw inner circle
      this.context.beginPath();
      this.context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      this.context.fillStyle = "rgba(255, 100, 100, 1)";
      this.context.strokeStyle = "white";
      this.context.lineWidth = 2 + 4 * (1 - t);
      this.context.fill();
      this.context.stroke();

      // Update image data
      this.data = new Uint8Array(this.context.getImageData(0, 0, this.width, this.height).data);

      // Trigger map repaint
      if (mapRef.current) {
        mapRef.current.triggerRepaint();
      }

      return true;
    },
  };

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current) {
      try {
        mapRef.current = new trackasiagl.Map({
          container: mapContainerRef.current,
          style: `https://maps.track-asia.com/styles/v2/streets.json?key=${TRACK_ASIA_ACCESS_TOKEN}`,
          center: [105.8542, 21.0285], // Hanoi center
          zoom: 10,
        });

        mapRef.current.on("load", () => {
          // Add pulsing dot
          mapRef.current!.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });

          // Add source and layer for marker
          mapRef.current!.addSource("points", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [105.8542, 21.0285],
                  },
                  properties: {}, // Add properties to satisfy GeoJSON
                },
              ],
            },
          });

          mapRef.current!.addLayer({
            id: "points",
            type: "symbol",
            source: "points",
            layout: {
              "icon-image": "pulsing-dot",
            },
          });

          console.log("✅ Pulsing dot marker hiển thị tại Hà Nội");
        });

        mapRef.current.on("error", (e) => {
          setMapError(`Lỗi tải bản đồ: ${e.error?.message || "Không thể tải style bản đồ"}`);
          setToastMessage(`❌ Lỗi tải bản đồ: ${e.error?.message || "Vui lòng thử lại"}`);
          setToastType("error");
          setToastVisible(true);
        });

        return () => {
          mapRef.current?.remove();
        };
      } catch (error: any) {
        setMapError(`Lỗi khởi tạo bản đồ: ${error.message || "Không xác định"}`);
        setToastMessage(`❌ Lỗi khởi tạo bản đồ: ${error.message || "Vui lòng thử lại"}`);
        setToastType("error");
        setToastVisible(true);
      }
    }
  }, []);

  // Update map with new coordinates
  const updateMap = useCallback(
    (lng: number, lat: number, address: string) => {
      if (mapRef.current && !mapError) {
        if (lat === 0 && lng === 0) {
          console.log("Cảnh báo: Tọa độ không hợp lệ (0, 0), bỏ qua cập nhật bản đồ.");
          setToastMessage("❌ Tọa độ không hợp lệ, vui lòng thử lại địa chỉ khác.");
          setToastType("error");
          setToastVisible(true);
          return;
        }

        const bounds = new trackasiagl.LngLatBounds(
          [lng - 0.02, lat - 0.02],
          [lng + 0.02, lat + 0.02]
        );
        mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 16 });

        // Update source data
        const source = mapRef.current.getSource("points") as trackasiagl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [lng, lat],
                },
                properties: {}, // Add properties to satisfy GeoJSON
              },
            ],
          });
          console.log("Marker updated to:", [lng, lat]);

          // Add popup
          if (markerRef.current) {
            markerRef.current.remove();
          }
          markerRef.current = new trackasiagl.Marker()
            .setLngLat([lng, lat])
            .setPopup(
              new trackasiagl.Popup({ maxWidth: "200px", offset: 10, className: "custom-popup" }).setText(address)
            )
            .addTo(mapRef.current);
          markerRef.current.getPopup().addTo(mapRef.current);
        }

        console.log(`Cập nhật bản đồ: lng=${lng}, lat=${lat}, address=${address}`);
      }
    },
    [mapError]
  );

  // Fetch products and cart
  useEffect(() => {
    const loadData = async () => {
      const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      const fetchedProducts = await fetchProducts();
      setCart(storedCart);
      setProducts(fetchedProducts);
    };
    loadData();
  }, []);

  // Autocomplete address suggestions
  const fetchAutocompleteSuggestions = useCallback(
    async (query: string, retryCount = 1) => {
      if (!query.trim()) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          input: query,
          key: TRACK_ASIA_ACCESS_TOKEN,
          size: "10",
          new_admin: "true",
          include_old_admin: "true",
          location: "21.0285,105.8542", // Bias to Hanoi
        });

        const response = await fetch(`https://maps.track-asia.com/api/v2/place/autocomplete/json?${params}`);
        const data = await response.json();

        console.log("Autocomplete query:", query);
        console.log("Autocomplete response:", data);

        if (data.status === "OK") {
          setAddressSuggestions(data.predictions || []);
          setShowSuggestions(true);
        } else {
          throw new Error(data.error_message || "Không tìm thấy gợi ý");
        }
      } catch (error: any) {
        if (retryCount > 0) {
          setTimeout(() => fetchAutocompleteSuggestions(query, retryCount - 1), 1000);
          return;
        }
        setAddressSuggestions([]);
        setShowSuggestions(false);
        setToastMessage(`❌ Lỗi khi tải gợi ý địa chỉ: ${error.message || "Vui lòng thử lại."}`);
        setToastType("error");
        setToastVisible(true);
      }
    },
    []
  );

  // Search coordinates from address
  const handleSearchCoordinates = useCallback(
    async (address: string, retryCount = 1) => {
      if (!address.trim()) {
        setToastMessage("❌ Vui lòng nhập địa chỉ trước khi tìm tọa độ.");
        setToastType("error");
        setToastVisible(true);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          query: address,
          key: TRACK_ASIA_ACCESS_TOKEN,
          language: "vi",
          new_admin: "true",
          include_old_admin: "true",
          radius: "50000", // 50km
          location: "21.0285,105.8542", // Bias to Hanoi
        });

        const response = await fetch(`https://maps.track-asia.com/api/v2/place/textsearch/json?${params}`);
        const data = await response.json();

        console.log("TextSearch query:", address);
        console.log("TextSearch response:", data);

        if (data.status === "OK" && data.results && data.results.length > 0) {
          const stringSimilarity = (str1: string, str2: string) => {
            str1 = str1.toLowerCase();
            str2 = str2.toLowerCase();
            const words1 = str1.split(/\s+/);
            const words2 = str2.split(/\s+/);
            return words1.filter((word) => words2.includes(word)).length / Math.max(words1.length, words2.length);
          };

          const result = data.results.reduce((best: any, curr: any) => {
            const currScore = stringSimilarity(address, curr.formatted_address);
            const bestScore = best ? stringSimilarity(address, best.formatted_address) : -1;
            return currScore > bestScore ? curr : best;
          }, null) || data.results[0];

          const lat = result.geometry?.location?.lat || null;
          const lng = result.geometry?.location?.lng || null;
          console.log(`Tọa độ tìm thấy: lat=${lat}, lng=${lng}`);

          form.setValue("lat", lat);
          form.setValue("lng", lng);
          form.setValue("address", result.formatted_address || address);
          setToastMessage(`✅ Tìm tọa độ thành công: ${result.formatted_address || address}`);
          setToastType("success");
          setToastVisible(true);
          updateMap(lng || 0, lat || 0, result.formatted_address || address);
        } else if (data.status === "ZERO_RESULTS") {
          setToastMessage("❌ Không tìm thấy địa chỉ phù hợp. Vui lòng kiểm tra lại.");
          setToastType("error");
          setToastVisible(true);
        } else {
          throw new Error(data.error_message || "Lỗi tìm kiếm địa chỉ");
        }
      } catch (error: any) {
        if (retryCount > 0) {
          setTimeout(() => handleSearchCoordinates(address, retryCount - 1), 1000);
          return;
        }
        setToastMessage(`❌ Lỗi khi tìm tọa độ: ${error.message || "Vui lòng thử lại."}`);
        setToastType("error");
        setToastVisible(true);
      } finally {
        setIsSearching(false);
      }
    },
    [form, updateMap]
  );

  // Select suggestion from autocomplete
  const handleSelectSuggestion = useCallback(
    (suggestion: any) => {
      const address = suggestion.description || suggestion.terms?.map((t: any) => t.value).join(" ") || "";
      console.log("Selected suggestion:", address);
      form.setValue("address", address);
      setShowSuggestions(false);
      setAddressSuggestions([]);
      handleSearchCoordinates(address);
    },
    [form, handleSearchCoordinates]
  );

  // Form submission handler
  const onSubmit = async (data: FormData) => {
    try {
      for (const item of cart) {
        const product = products.find((p) => p.id === item.id);
        if (!product || item.quantity > product.quantity) {
          setToastMessage(`Sản phẩm ${item.name} chỉ còn ${product?.quantity || 0} trong kho.`);
          setToastType("error");
          setToastVisible(true);
          return;
        }
      }

      const order: Order = {
        id: uuidv4(),
        customerName: data.name,
        phone: data.phone,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        total: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
        date: new Date().toISOString(),
        status: "pending",
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      await addOrder(order);
      localStorage.removeItem("cart");
      setCart([]);
      setToastMessage(`✅ Đặt hàng thành công!\nTên: ${data.name}\nSố điện thoại: ${data.phone}\nĐịa chỉ: ${data.address}`);
      setToastType("success");
      setToastVisible(true);
      form.reset();
    } catch (error) {
      setToastMessage("❌ Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại!");
      setToastType("error");
      setToastVisible(true);
    }
  };

  // Calculate total
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <ToastNotification
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />

      <motion.section
        className="p-6 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6 text-green-700 dark:text-green-400">
          🧾 Thanh toán
        </h1>
        {cart.length > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Giỏ hàng</h2>
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between mb-2">
                <span>{item.name} (x{item.quantity})</span>
                <span>{(item.price * item.quantity).toLocaleString("vi-VN")}đ</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold">
              <span>Tổng cộng:</span>
              <span>{total.toLocaleString("vi-VN")}đ</span>
            </div>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-card p-6 rounded-2xl shadow-lg"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder="+84..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ giao hàng</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="address"
                            {...field}
                            ref={addressInputRef}
                            placeholder="Nhập địa chỉ để nhận gợi ý tự động..."
                            onChange={(e) => {
                              field.onChange(e);
                              if (debounceTimer) {
                                clearTimeout(debounceTimer);
                              }
                              const timer = setTimeout(() => {
                                fetchAutocompleteSuggestions(e.target.value);
                              }, 200);
                              setDebounceTimer(timer);
                            }}
                          />
                          {showSuggestions && addressSuggestions.length > 0 && (
                            <ul className="absolute z-10 bg-white dark:bg-gray-800 border rounded-md mt-1 w-full max-h-60 overflow-y-auto shadow-lg">
                              {addressSuggestions.map((suggestion, idx) => (
                                <li
                                  key={idx}
                                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                                  onClick={() => handleSelectSuggestion(suggestion)}
                                >
                                  <div className="font-medium">
                                    {suggestion.description || suggestion.terms?.map((t: any) => t.value).join(" ") || ""}
                                  </div>
                                  {suggestion.structured_formatting?.main_text && (
                                    <div className="text-sm text-gray-500">
                                      {suggestion.structured_formatting.main_text}
                                    </div>
                                  )}
                                  {suggestion.structured_formatting?.secondary_text && (
                                    <div className="text-sm text-gray-400">
                                      {suggestion.structured_formatting.secondary_text}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleSearchCoordinates(field.value)}
                          disabled={isSearching || !field.value.trim()}
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                        >
                          {isSearching ? "..." : "Tìm tọa độ"}
                        </Button>
                      </div>
                      {mapError ? (
                        <div className="w-full h-[200px] rounded-md border flex items-center justify-center text-red-500 overflow-hidden">
                          {mapError}
                        </div>
                      ) : (
                        <div
                          ref={mapContainerRef}
                          className="w-full h-[200px] rounded-md border overflow-hidden"
                          style={{ position: "relative" }}
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phương thức thanh toán</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border p-2 rounded-lg w-full focus:ring-green-500"
                    >
                      <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                      <option value="solana">Ví Solana</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-green-600 text-white hover:bg-green-700 py-3 text-lg rounded-xl"
            >
              Xác nhận đặt hàng
            </Button>
          </form>
        </Form>
      </motion.section>
    </div>
  );
};

export default Checkout;