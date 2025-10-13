import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { addProduct, mintNFT } from '../../services/api';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { motion } from 'framer-motion';
import { Leaf, Plus, Trash2 } from 'lucide-react';
import { Toaster } from '../../components/ui/toaster';
import { toast } from '../../hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product, Certification, TimelineEntry } from '../../types/types';
import trackasiagl from 'trackasia-gl';
import React from 'react';

const timelineDefaults = [
  { title: 'Trồng trọt', desc: 'Bắt đầu gieo trồng sản phẩm.' },
  { title: 'Thu hoạch', desc: 'Thu hoạch sản phẩm từ nông trại.' },
  { title: 'Vận chuyển', desc: 'Vận chuyển sản phẩm đến cơ sở chế biến hoặc kho.' },
  { title: 'Kiểm định', desc: 'Kiểm tra chất lượng và an toàn sản phẩm.' },
  { title: 'Phân phối', desc: 'Phân phối sản phẩm đến các điểm bán.' },
  { title: 'Bàn ăn', desc: 'Sản phẩm sẵn sàng cho người tiêu dùng.' },
];

const schema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  description: z.string().min(10, 'Mô tả phải ít nhất 10 ký tự'),
  price: z.number().positive('Giá phải lớn hơn 0'),
  image: z.any().refine((file) => file instanceof File && ['image/jpeg', 'image/png'].includes(file.type), {
    message: 'Vui lòng tải lên tệp ảnh JPEG hoặc PNG',
  }),
  origin: z.string().min(1, 'Xuất xứ là bắt buộc'),
  farmerName: z.string().min(1, 'Tên nông dân là bắt buộc'),
  productionDate: z.string().min(1, 'Ngày sản xuất là bắt buộc'),
  quantity: z.number().nonnegative('Số lượng phải lớn hơn hoặc bằng 0'),
  certifications: z.array(
    z.object({
      name: z.string().min(1, 'Tên chứng nhận là bắt buộc'),
      file: z.any().refine((file) => file instanceof File && ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type), {
        message: 'Vui lòng tải lên tệp JPEG, PNG hoặc PDF',
      }),
    })
  ).optional(),
  timeline: z.array(
    z.object({
      title: z.string().min(1, 'Tiêu đề là bắt buộc'),
      desc: z.string().min(1, 'Mô tả là bắt buộc'),
      date: z.string().min(1, 'Ngày là bắt buộc'),
      location: z.string().min(1, 'Địa điểm là bắt buộc'),
      lat: z.number().optional(),
      lng: z.number().optional(),
      responsible: z.string().min(1, 'Người phụ trách là bắt buộc'),
      details: z.string().optional(),
    })
  ).min(1, 'Phải có ít nhất một mốc thời gian')
    .refine(
      (timeline) => {
        for (let i = 1; i < timeline.length; i++) {
          const prevDate = new Date(timeline[i - 1].date);
          const currDate = new Date(timeline[i].date);
          if (currDate < prevDate) {
            return false;
          }
        }
        return true;
      },
      { message: 'Ngày của các mốc thời gian phải theo thứ tự từ sớm đến muộn', path: ['timeline'] }
    ),
});

type FormData = z.infer<typeof schema>;

const TRACK_ASIA_ACCESS_TOKEN = import.meta.env.VITE_TRACK_ASIA_ACCESS_TOKEN || 'e7e09d5a3e76bc8e71760189816caff185';

// Error Boundary Component
class AddProductErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-red-500">
          <h2>Đã xảy ra lỗi trong giao diện thêm sản phẩm.</h2>
          <p>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const AddProduct = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      certifications: [],
      timeline: timelineDefaults.map(({ title, desc }) => ({
        title,
        desc,
        date: '',
        location: '',
        responsible: '',
        details: '',
      })),
      quantity: 0,
    },
  });
  const { fields: timelineFields, append: appendTimeline, remove: removeTimeline } = useFieldArray({
    control: form.control,
    name: 'timeline',
  });
  const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({
    control: form.control,
    name: 'certifications',
  });
  const [step, setStep] = useState('info');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<{ [key: number]: any[] }>({});
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [isSearching, setIsSearching] = useState<{ [key: number]: boolean }>({});
  const [mapErrors, setMapErrors] = useState<{ [key: number]: string | null }>({});
  const mapRefs = useRef<(trackasiagl.Map | null)[]>([]);
  const markerRefs = useRef<(trackasiagl.Marker | null)[]>([]);
  const debounceTimers = useRef<{ [key: number]: number | null }>({});
  const observerRefs = useRef<(MutationObserver | null)[]>([]);
  const mapContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const queryClient = useQueryClient();

  const { mutate: add } = useMutation({
    mutationFn: async ({ newProduct, blockchainTxId }: { newProduct: Omit<Product, 'id' | 'blockchainTxId'>; blockchainTxId: string }) => {
      return addProduct(newProduct, blockchainTxId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Thêm sản phẩm thành công!',
        description: 'Sản phẩm đã được thêm và đồng bộ.',
      });
      form.reset({
        certifications: [],
        timeline: timelineDefaults.map(({ title, desc }) => ({
          title,
          desc,
          date: '',
          location: '',
          responsible: '',
          details: '',
        })),
        quantity: 0,
      });
      setImagePreview(null);
    },
    onError: () => {
      toast({
        title: 'Lỗi khi thêm sản phẩm',
        description: 'Đã xảy ra sự cố. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
  });

  // Debounce utility
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: number;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Define pulsing dot for each map
  const createPulsingDot = (map: trackasiagl.Map) => {
    const size = 200;
    return {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
      context: null as CanvasRenderingContext2D | null,

      onAdd: function () {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext('2d');
      },

      render: function () {
        const duration = 1000;
        const t = (performance.now() % duration) / duration;

        const radius = (size / 2) * 0.3;
        const outerRadius = (size / 2) * 0.7 * t + radius;
        if (!this.context) return false;

        this.context.clearRect(0, 0, this.width, this.height);
        this.context.beginPath();
        this.context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
        this.context.fillStyle = `rgba(255, 200, 200,${1 - t})`;
        this.context.fill();

        this.context.beginPath();
        this.context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        this.context.fillStyle = 'rgba(255, 100, 100, 1)';
        this.context.strokeStyle = 'white';
        this.context.lineWidth = 2 + 4 * (1 - t);
        this.context.fill();
        this.context.stroke();

        this.data = new Uint8Array(this.context.getImageData(0, 0, this.width, this.height).data);

        map.triggerRepaint();
        return true;
      },
    };
  };

  // Initialize maps for each timeline entry
  const initializeMap = useCallback((index: number, container: HTMLDivElement) => {
    try {
      if (!container.isConnected) {
        throw new Error(`Map container for index ${index} is not in the DOM`);
      }

      const map = new trackasiagl.Map({
        container,
        style: `https://maps.track-asia.com/styles/v2/streets.json?key=${TRACK_ASIA_ACCESS_TOKEN}`,
        center: [105.8542, 21.0285], // Hanoi center
        zoom: 10,
      });

      map.on('load', () => {
        console.log(`Map loaded for timeline entry ${index}`);
        const pulsingDot = createPulsingDot(map);
        map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

        map.addSource('points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [105.8542, 21.0285],
                },
                properties: {},
              },
            ],
          },
        });

        map.addLayer({
          id: 'points',
          type: 'symbol',
          source: 'points',
          layout: {
            'icon-image': 'pulsing-dot',
          },
        });

        map.resize();
        console.log(`Map initialized for timeline entry ${index}`);
      });

      map.on('error', (e) => {
        console.error(`Map error for timeline entry ${index}:`, e);
        setMapErrors((prev) => ({ ...prev, [index]: `Lỗi tải bản đồ: ${e.error?.message || 'Vui lòng thử lại'}` }));
        toast({
          title: 'Lỗi tải bản đồ',
          description: `❌ Lỗi tải bản đồ: ${e.error?.message || 'Vui lòng thử lại'}`,
          variant: 'destructive',
        });
      });

      mapRefs.current[index] = map;
    } catch (error: any) {
      console.error(`Failed to initialize map for timeline entry ${index}:`, error);
      setMapErrors((prev) => ({ ...prev, [index]: `Lỗi khởi tạo bản đồ: ${error.message || 'Vui lòng thử lại'}` }));
      toast({
        title: 'Lỗi khởi tạo bản đồ',
        description: `❌ Lỗi khởi tạo bản đồ: ${error.message || 'Vui lòng thử lại'}`,
        variant: 'destructive',
      });
    }
  }, []);

  // Clean up timeline entry resources
  const cleanupTimelineEntry = useCallback((index: number) => {
    // Clean up map
    if (mapRefs.current[index]) {
      mapRefs.current[index]!.remove();
      mapRefs.current[index] = null;
    }
    // Clean up marker
    if (markerRefs.current[index]) {
      markerRefs.current[index]!.remove();
      markerRefs.current[index] = null;
    }
    // Clean up observer
    if (observerRefs.current[index]) {
      observerRefs.current[index]!.disconnect();
      observerRefs.current[index] = null;
    }
    // Clean up debounce timer
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]!);
      delete debounceTimers.current[index];
    }
    // Clean up suggestions and errors
    setAddressSuggestions((prev) => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
    setShowSuggestions((prev) => {
      const newShow = { ...prev };
      delete newShow[index];
      return newShow;
    });
    setIsSearching((prev) => {
      const newSearching = { ...prev };
      delete newSearching[index];
      return newSearching;
    });
    setMapErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  }, []);

  // Handle adding a timeline entry
  const handleAppendTimeline = useCallback(() => {
    appendTimeline({
      title: '',
      desc: '',
      date: '',
      location: '',
      responsible: '',
      details: '',
    });
  }, [appendTimeline]);

  // Handle removing a timeline entry
  const handleRemoveTimeline = useCallback(
    (index: number) => {
      cleanupTimelineEntry(index);
      removeTimeline(index);
      // Shift refs for remaining entries
      mapRefs.current = [
        ...mapRefs.current.slice(0, index),
        ...mapRefs.current.slice(index + 1),
      ];
      markerRefs.current = [
        ...markerRefs.current.slice(0, index),
        ...markerRefs.current.slice(index + 1),
      ];
      observerRefs.current = [
        ...observerRefs.current.slice(0, index),
        ...observerRefs.current.slice(index + 1),
      ];
      mapContainerRefs.current = [
        ...mapContainerRefs.current.slice(0, index),
        ...mapContainerRefs.current.slice(index + 1),
      ];
    },
    [removeTimeline, cleanupTimelineEntry]
  );

  // Monitor DOM for map containers
  useEffect(() => {
    if (step !== 'timeline') {
      // Clean up all maps when not on timeline tab
      mapRefs.current.forEach((map, index) => {
        if (map) {
          map.remove();
          mapRefs.current[index] = null;
        }
      });
      observerRefs.current.forEach((observer) => observer?.disconnect());
      observerRefs.current = [];
      mapContainerRefs.current = [];
      return;
    }

    timelineFields.forEach((_, index) => {
      const container = document.getElementById(`map-container-${index}`);
      if (container && !mapRefs.current[index]) {
        if (container instanceof HTMLDivElement) {
          mapContainerRefs.current[index] = container;
          initializeMap(index, container);
        } else {
          console.error(`Container for index ${index} is not a div element`);
          setMapErrors((prev) => ({ ...prev, [index]: 'Container is not a div element' }));
        }
      } else if (!container) {
        const observer = new MutationObserver((mutations, obs) => {
          const containerNow = document.getElementById(`map-container-${index}`);
          if (containerNow && containerNow instanceof HTMLDivElement) {
            mapContainerRefs.current[index] = containerNow;
            initializeMap(index, containerNow);
            obs.disconnect();
            observerRefs.current[index] = null;
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        observerRefs.current[index] = observer;
      }
    });

    return () => {
      observerRefs.current.forEach((observer) => observer?.disconnect());
      mapRefs.current.forEach((map, index) => {
        if (map) {
          map.remove();
          mapRefs.current[index] = null;
        }
      });
      mapContainerRefs.current = [];
    };
  }, [step, timelineFields, initializeMap]);

  // Debounced resize for maps
  const resizeMaps = useCallback(
    debounce(() => {
      timelineFields.forEach((_, index) => {
        const map = mapRefs.current[index];
        const container = mapContainerRefs.current[index];
        if (map && container && container.isConnected) {
          map.resize();
          console.log(`Map resized for index ${index}`);
        }
      });
    }, 300),
    [timelineFields]
  );

  // Resize maps when switching to timeline tab
  useEffect(() => {
    if (step === 'timeline') {
      resizeMaps();
    }
  }, [step, resizeMaps]);

  // Update map for a specific timeline entry
  const updateMap = useCallback(
    (index: number, lng: number, lat: number, location: string) => {
      const map = mapRefs.current[index];
      if (map && !mapErrors[index]) {
        if (lat === 0 && lng === 0) {
          toast({
            title: 'Tọa độ không hợp lệ',
            description: '❌ Tọa độ không hợp lệ, vui lòng thử lại địa chỉ khác.',
            variant: 'destructive',
          });
          return;
        }

        const bounds = new trackasiagl.LngLatBounds([lng - 0.02, lat - 0.02], [lng + 0.02, lat + 0.02]);
        map.fitBounds(bounds, { padding: 40, maxZoom: 16 });

        const source = map.getSource('points') as trackasiagl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat],
                },
                properties: {},
              },
            ],
          });
        }

        if (markerRefs.current[index]) {
          markerRefs.current[index]!.remove();
        }
        markerRefs.current[index] = new trackasiagl.Marker()
          .setLngLat([lng, lat])
          .setPopup(
            new trackasiagl.Popup({ maxWidth: '200px', offset: 10, className: 'custom-popup' }).setText(location)
          )
          .addTo(map);
        markerRefs.current[index]!.getPopup().addTo(map);

        map.resize();
        console.log(`Map updated for timeline entry ${index}: lng=${lng}, lat=${lat}, location=${location}`);
      } else {
        console.warn(`Cannot update map for timeline entry ${index}: map or error state`, { map, error: mapErrors[index] });
      }
    },
    [mapErrors]
  );

  // Fetch autocomplete suggestions
  const fetchAutocompleteSuggestions = useCallback(
    async (query: string, index: number, retryCount = 1) => {
      if (!query.trim()) {
        setAddressSuggestions((prev) => ({ ...prev, [index]: [] }));
        setShowSuggestions((prev) => ({ ...prev, [index]: false }));
        return;
      }

      try {
        const params = new URLSearchParams({
          input: query,
          key: TRACK_ASIA_ACCESS_TOKEN,
          size: '10',
          new_admin: 'true',
          include_old_admin: 'true',
          location: '21.0285,105.8542',
        });

        const response = await fetch(`https://maps.track-asia.com/api/v2/place/autocomplete/json?${params}`);
        const data = await response.json();

        if (data.status === 'OK') {
          setAddressSuggestions((prev) => ({ ...prev, [index]: data.predictions || [] }));
          setShowSuggestions((prev) => ({ ...prev, [index]: true }));
        } else {
          throw new Error(data.error_message || 'Không tìm thấy gợi ý');
        }
      } catch (error: any) {
        if (retryCount > 0) {
          setTimeout(() => fetchAutocompleteSuggestions(query, index, retryCount - 1), 1000);
          return;
        }
        setAddressSuggestions((prev) => ({ ...prev, [index]: [] }));
        setShowSuggestions((prev) => ({ ...prev, [index]: false }));
        toast({
          title: 'Lỗi khi tải gợi ý địa chỉ',
          description: `❌ Lỗi khi tải gợi ý địa chỉ: ${error.message || 'Vui lòng thử lại.'}`,
          variant: 'destructive',
        });
      }
    },
    []
  );

  // Search coordinates from location
  const handleSearchCoordinates = useCallback(
    async (location: string, index: number, retryCount = 1) => {
      if (!location.trim()) {
        toast({
          title: 'Vui lòng nhập địa điểm',
          description: '❌ Vui lòng nhập địa chỉ trước khi tìm tọa độ.',
          variant: 'destructive',
        });
        return;
      }

      setIsSearching((prev) => ({ ...prev, [index]: true }));
      try {
        const params = new URLSearchParams({
          query: location,
          key: TRACK_ASIA_ACCESS_TOKEN,
          language: 'vi',
          new_admin: 'true',
          include_old_admin: 'true',
          radius: '50000',
          location: '21.0285,105.8542',
        });

        const response = await fetch(`https://maps.track-asia.com/api/v2/place/textsearch/json?${params}`);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const stringSimilarity = (str1: string, str2: string) => {
            str1 = str1.toLowerCase();
            str2 = str2.toLowerCase();
            const words1 = str1.split(/\s+/);
            const words2 = str2.split(/\s+/);
            return words1.filter((word) => words2.includes(word)).length / Math.max(words1.length, words2.length);
          };

          const result = data.results.reduce((best: any, curr: any) => {
            const currScore = stringSimilarity(location, curr.formatted_address);
            const bestScore = best ? stringSimilarity(location, best.formatted_address) : -1;
            return currScore > bestScore ? curr : best;
          }, null) || data.results[0];

          const lat = result.geometry?.location?.lat || null;
          const lng = result.geometry?.location?.lng || null;

          form.setValue(`timeline.${index}.lat`, lat);
          form.setValue(`timeline.${index}.lng`, lng);
          form.setValue(`timeline.${index}.location`, result.formatted_address || location);
          toast({
            title: 'Tìm tọa độ thành công',
            description: `✅ Tìm tọa độ thành công: ${result.formatted_address || location}`,
          });
          updateMap(index, lng || 0, lat || 0, result.formatted_address || location);
        } else if (data.status === 'ZERO_RESULTS') {
          toast({
            title: 'Không tìm thấy địa chỉ',
            description: '❌ Không tìm thấy địa chỉ phù hợp. Vui lòng kiểm tra lại.',
            variant: 'destructive',
          });
        } else {
          throw new Error(data.error_message || 'Lỗi tìm kiếm địa chỉ');
        }
      } catch (error: any) {
        if (retryCount > 0) {
          setTimeout(() => handleSearchCoordinates(location, index, retryCount - 1), 1000);
          return;
        }
        toast({
          title: 'Lỗi khi tìm tọa độ',
          description: `❌ Lỗi khi tìm tọa độ: ${error.message || 'Vui lòng thử lại.'}`,
          variant: 'destructive',
        });
      } finally {
        setIsSearching((prev) => ({ ...prev, [index]: false }));
      }
    },
    [form, updateMap]
  );

  // Handle select suggestion
  const handleSelectSuggestion = useCallback(
    (suggestion: any, index: number) => {
      const address = suggestion.description || suggestion.terms?.map((t: any) => t.value).join(' ') || '';
      form.setValue(`timeline.${index}.location`, address);
      setShowSuggestions((prev) => ({ ...prev, [index]: false }));
      setAddressSuggestions((prev) => ({ ...prev, [index]: [] }));
      handleSearchCoordinates(address, index);
    },
    [form, handleSearchCoordinates]
  );

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      form.setValue(`timeline.${index}.location`, value);
      if (debounceTimers.current[index]) {
        clearTimeout(debounceTimers.current[index]!);
      }
      debounceTimers.current[index] = setTimeout(() => {
        fetchAutocompleteSuggestions(value, index);
      }, 200);
    },
    [form, fetchAutocompleteSuggestions]
  );

  const onSubmit = async (data: FormData) => {
    try {
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data.image);
      });

      const certifications = await Promise.all(
        (data.certifications || []).map(async (cert) => ({
          name: cert.name,
          file: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(cert.file);
          }),
        }))
      );

      const newProduct: Omit<Product, 'id' | 'blockchainTxId'> = {
        ...data,
        image: imageBase64,
        certifications,
        timeline: data.timeline,
        quantity: data.quantity,
      };
      const txId = await mintNFT(data, {});
      add({ newProduct, blockchainTxId: txId });
    } catch (error) {
      toast({
        title: 'Lỗi khi thêm sản phẩm',
        description: 'Đã xảy ra sự cố. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AddProductErrorBoundary>
      <DashboardLayout role="farmer">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6"
        >
          <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
            <Leaf className="w-8 h-8 mr-2 text-green-600" />
            Thêm sản phẩm mới
          </h1>

          <Tabs
            value={step}
            onValueChange={setStep}
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-200 dark:border-green-700"
          >
            <TabsList className="mb-6 justify-start">
              <TabsTrigger value="info">Thông tin cơ bản</TabsTrigger>
              <TabsTrigger value="details">Chi tiết sản phẩm</TabsTrigger>
              <TabsTrigger value="timeline">Dòng thời gian</TabsTrigger>
              <TabsTrigger value="certifications">Chứng nhận</TabsTrigger>
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <TabsContent value="info" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên sản phẩm</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập tên sản phẩm..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Mô tả sản phẩm..." {...field} />
                        </FormControl>
                        <p className="text-sm text-gray-500">
                          {field.value?.length || 0}/10 ký tự
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá (VNĐ)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Nhập giá..."
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hình ảnh sản phẩm</FormLabel>
                        <FormControl>
                          <div>
                            {imagePreview && (
                              <img
                                src={imagePreview}
                                alt="Product preview"
                                className="w-32 h-32 object-cover mb-2 rounded-md"
                              />
                            )}
                            <Input
                              type="file"
                              accept="image/jpeg,image/png"
                              onChange={(e) => {
                                const file = e.target.files ? e.target.files[0] : null;
                                field.onChange(file);
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setImagePreview(reader.result as string);
                                  reader.readAsDataURL(file);
                                } else {
                                  setImagePreview(null);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xuất xứ</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập xuất xứ..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên nông dân</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập tên nông dân..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="productionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày sản xuất</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số lượng (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Nhập số lượng..."
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Dòng thời gian sản xuất</h3>
                    {timelineFields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-md space-y-4">
                        <FormField
                          control={form.control}
                          name={`timeline.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tiêu đề</FormLabel>
                              <FormControl>
                                <Input placeholder="Nhập tiêu đề..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`timeline.${index}.desc`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mô tả</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Mô tả sự kiện..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`timeline.${index}.date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ngày</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`timeline.${index}.location`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Địa điểm</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <Input
                                        id={`location-${index}`}
                                        placeholder="Nhập địa điểm để nhận gợi ý tự động..."
                                        {...field}
                                        onChange={handleInputChange(index)}
                                      />
                                      {showSuggestions[index] && addressSuggestions[index]?.length > 0 && (
                                        <ul className="absolute z-10 bg-white dark:bg-gray-800 border rounded-md mt-1 w-full max-h-60 overflow-y-auto shadow-lg">
                                          {addressSuggestions[index].map((suggestion, idx) => (
                                            <li
                                              key={idx}
                                              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                                              onClick={() => handleSelectSuggestion(suggestion, index)}
                                            >
                                              <div className="font-medium">
                                                {suggestion.description || suggestion.terms?.map((t: any) => t.value).join(' ') || ''}
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
                                      onClick={() => handleSearchCoordinates(field.value, index)}
                                      disabled={isSearching[index] || !field.value.trim()}
                                      variant="outline"
                                      size="sm"
                                      className="shrink-0"
                                    >
                                      {isSearching[index] ? '...' : 'Tìm tọa độ'}
                                    </Button>
                                  </div>
                                  {mapErrors[index] ? (
                                    <div className="w-full h-[200px] rounded-md border flex items-center justify-center text-red-500 overflow-hidden">
                                      {mapErrors[index]}
                                    </div>
                                  ) : (
                                    <div
                                      id={`map-container-${index}`}
                                      ref={(el) => { mapContainerRefs.current[index] = el; }}
                                      className="w-full h-[200px] rounded-md border overflow-hidden"
                                      style={{ position: 'relative' }}
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
                          name={`timeline.${index}.responsible`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Người phụ trách</FormLabel>
                              <FormControl>
                                <Input placeholder="Nhập người phụ trách..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`timeline.${index}.details`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chi tiết (không bắt buộc)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Nhập chi tiết..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {timelineFields.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleRemoveTimeline(index)}
                            className="mt-2"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa mốc thời gian
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAppendTimeline}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm mốc thời gian
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="certifications" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Chứng nhận</h3>
                    {certificationFields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-md space-y-4">
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tên chứng nhận</FormLabel>
                              <FormControl>
                                <Input placeholder="VD: VietGAP, Organic..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`certifications.${index}.file`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tệp chứng nhận (JPEG, PNG, PDF)</FormLabel>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept="image/jpeg,image/png,application/pdf"
                                  onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => removeCertification(index)}
                          className="mt-2"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa chứng nhận
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendCertification({ name: '', file: null })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm chứng nhận
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="blockchain" className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    Kết nối ví để mint NFT cho sản phẩm (đang sử dụng mock).
                  </p>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    Mint NFT & Thêm sản phẩm
                  </Button>
                </TabsContent>
              </form>
            </Form>
          </Tabs>

          <Toaster />
        </motion.div>
      </DashboardLayout>
    </AddProductErrorBoundary>
  );
};

export default AddProduct;