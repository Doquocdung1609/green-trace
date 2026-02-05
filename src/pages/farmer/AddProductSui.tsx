import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { addProduct } from '../../services/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { motion } from 'framer-motion';
import { Leaf, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import type { Product, Certification } from '../../types/types';
import trackasiagl from 'trackasia-gl';

const PACKAGE_ID = '0xcf09b3fc7338516dd465a4dcfccbc6e9cfa875e730aa9d7e84c3dc5f13f14e73';

const timelineDefaults = [
  { title: 'Trồng trọt', desc: 'Bắt đầu gieo trồng sản phẩm.' },
  { title: 'Chăm sóc', desc: 'Chăm sóc và bảo vệ sản phẩm trong quá trình phát triển.' },
  { title: 'Bón phân', desc: 'Bón phân cho cây trồng.' },
  { title: 'Kiểm định', desc: 'Kiểm tra chất lượng và an toàn sản phẩm.' },

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
  productionDate: z.string().min(1, 'Ngày gieo trồng là bắt buộc'),
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
  ).min(1, 'Phải có ít nhất một mốc thời gian'),
  roi: z.number().nonnegative('ROI phải lớn hơn hoặc bằng 0'),
  growthRate: z.number().nonnegative('Tỷ lệ tăng trưởng phải lớn hơn hoặc bằng 0'),
  age: z.number().nonnegative('Tuổi phải lớn hơn hoặc bằng 0'),
  iotStatus: z.enum(['Đang theo dõi', 'Ngưng theo dõi', 'Lỗi cảm biến'] as const),
  iotData: z.object({
    height: z.number().nonnegative('Chiều cao phải lớn hơn hoặc bằng 0'),
    growthPerMonth: z.number('Tăng trưởng/tháng có thể âm hoặc dương'),
    humidity: z.number().min(0).max(100, 'Độ ẩm từ 0-100'),
    temperature: z.number('Nhiệt độ có thể âm'),
    pH: z.number().min(0).max(14, 'pH từ 0-14'),
    lastUpdated: z.string().min(1, 'Ngày cập nhật cuối là bắt buộc'),
  }),
});

type FormData = z.infer<typeof schema>;

const TRACK_ASIA_ACCESS_TOKEN = import.meta.env.VITE_TRACK_ASIA_ACCESS_TOKEN || 'e7e09d5a3e76bc8e71760189816caff185';

const AddProductSui = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      origin: '',
      farmerName: '',
      productionDate: '',
      certifications: [],
      timeline: timelineDefaults.map(({ title, desc }) => ({
        title,
        desc,
        date: '',
        location: '',
        lat: undefined,
        lng: undefined,
        responsible: '',
        details: '',
      })),
      quantity: 0,
      roi: 0,
      growthRate: 0,
      age: 0,
      iotStatus: 'Đang theo dõi' as const,
      iotData: {
        height: 0,
        growthPerMonth: 0,
        humidity: 0,
        temperature: 0,
        pH: 0,
        lastUpdated: new Date().toISOString(),
      },
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
  const [certificationPreviews, setCertificationPreviews] = useState<{ [key: number]: string | null }>({});
  const [isLoading, setIsLoading] = useState(false);

  const mapRefs = useRef<(trackasiagl.Map | null)[]>([]);
  const markerRefs = useRef<(trackasiagl.Marker | null)[]>([]);
  const mapContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mapErrors, setMapErrors] = useState<{ [key: number]: string | null }>({});
  const [addressSuggestions, setAddressSuggestions] = useState<{ [key: number]: any[] }>({});
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [isSearching, setIsSearching] = useState<{ [key: number]: boolean }>({});

  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

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
        const radius = size / 2 * 0.3;
        const outerRadius = size / 2 * 0.7 * t + radius;
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

  const initializeMap = useCallback((index: number, container: HTMLDivElement) => {
    if (!container) return;

    try {
      const map = new trackasiagl.Map({
        container,
        style: `https://maps.track-asia.com/styles/v2/streets.json?key=${TRACK_ASIA_ACCESS_TOKEN}`,
        center: [105.8542, 21.0285], 
        zoom: 9,
      });

      map.on('load', () => {
        const pulsingDot = createPulsingDot(map);
        map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

        map.addSource('point', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'point',
          type: 'symbol',
          source: 'point',
          layout: { 'icon-image': 'pulsing-dot' },
        });

        map.resize();
      });

      map.on('error', (e) => {
        setMapErrors(prev => ({ ...prev, [index]: 'Lỗi tải bản đồ' }));
        toast({ title: 'Lỗi bản đồ', description: e.error?.message || '', variant: 'destructive' });
      });

      mapRefs.current[index] = map;
    } catch (err: any) {
      setMapErrors(prev => ({ ...prev, [index]: err.message }));
    }
  }, []);

  const updateMapMarker = useCallback((index: number) => {
    const map = mapRefs.current[index];
    if (!map) return;

    const lat = form.getValues(`timeline.${index}.lat`);
    const lng = form.getValues(`timeline.${index}.lng`);
    const location = form.getValues(`timeline.${index}.location`);

    if (typeof lat !== 'number' || typeof lng !== 'number' || !location) return;

    const source = map.getSource('point') as trackasiagl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {}, }],
      });
    }

    if (markerRefs.current[index]) markerRefs.current[index]?.remove();

    markerRefs.current[index] = new trackasiagl.Marker()
      .setLngLat([lng, lat])
      .setPopup(new trackasiagl.Popup().setText(location))
      .addTo(map);

    map.fitBounds([[lng - 0.05, lat - 0.05], [lng + 0.05, lat + 0.05]], { padding: 30 });
  }, [form]);

  const fetchSuggestions = useCallback(async (query: string, index: number) => {
    if (!query.trim()) {
      setAddressSuggestions(prev => ({ ...prev, [index]: [] }));
      setShowSuggestions(prev => ({ ...prev, [index]: false }));
      return;
    }

    try {
      const params = new URLSearchParams({
        input: query,
        key: TRACK_ASIA_ACCESS_TOKEN,
        size: '8',
        location: '21.0285,105.8542',
      });
      const res = await fetch(`https://maps.track-asia.com/api/v2/place/autocomplete/json?${params}`);
      const data = await res.json();
      if (data.status === 'OK') {
        setAddressSuggestions(prev => ({ ...prev, [index]: data.predictions || [] }));
        setShowSuggestions(prev => ({ ...prev, [index]: true }));
      }
    } catch {}
  }, []);

  const geocodeLocation = useCallback(async (location: string, index: number) => {
    if (!location.trim()) return;

    setIsSearching(prev => ({ ...prev, [index]: true }));

    try {
      const params = new URLSearchParams({
        query: location,
        key: TRACK_ASIA_ACCESS_TOKEN,
        language: 'vi',
        location: '21.0285,105.8542',
      });
      const res = await fetch(`https://maps.track-asia.com/api/v2/place/textsearch/json?${params}`);
      const data = await res.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const best = data.results[0];
        const lat = best.geometry?.location?.lat;
        const lng = best.geometry?.location?.lng;
        const formatted = best.formatted_address || location;

        form.setValue(`timeline.${index}.lat`, lat);
        form.setValue(`timeline.${index}.lng`, lng);
        form.setValue(`timeline.${index}.location`, formatted);

        updateMapMarker(index);
        toast({ title: 'Tìm thấy', description: formatted });
      } else {
        toast({ title: 'Không tìm thấy', description: 'Thử địa chỉ khác', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi tìm kiếm', description: err.message, variant: 'destructive' });
    } finally {
      setIsSearching(prev => ({ ...prev, [index]: false }));
    }
  }, [form, updateMapMarker]);

  const observerRefs = useRef<(MutationObserver | null)[]>([]);

  useEffect(() => {
  if (step !== 'timeline') {
    mapRefs.current.forEach(m => m?.remove());
    mapRefs.current = [];
    markerRefs.current = [];
    mapContainerRefs.current = [];
    observerRefs.current.forEach(o => o?.disconnect());
    observerRefs.current = [];
    setMapErrors({});
    return;
  }

  timelineFields.forEach((_, index) => {
    const container = document.getElementById(`map-timeline-${index}`) as HTMLDivElement | null;

    if (container && !mapRefs.current[index]) {
      mapContainerRefs.current[index] = container;
      initializeMap(index, container);
      setTimeout(() => updateMapMarker(index), 800);
    } 
    else if (!mapRefs.current[index]) {
      const observer = new MutationObserver(() => {
        const containerNow = document.getElementById(`map-timeline-${index}`) as HTMLDivElement | null;
        if (containerNow && !mapRefs.current[index]) {
          mapContainerRefs.current[index] = containerNow;
          initializeMap(index, containerNow);
          setTimeout(() => updateMapMarker(index), 800);
          observer.disconnect();
          observerRefs.current[index] = null;
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      observerRefs.current[index] = observer;
    }
  });

  return () => {
    observerRefs.current.forEach(o => o?.disconnect());
    observerRefs.current = [];
  };
}, [step, timelineFields, initializeMap, updateMapMarker]);

  // Khi remove timeline entry
  const handleRemove = (index: number) => {
    if (mapRefs.current[index]) {
      mapRefs.current[index]?.remove();
      mapRefs.current.splice(index, 1);
    }
    if (markerRefs.current[index]) {
      markerRefs.current[index]?.remove();
      markerRefs.current.splice(index, 1);
    }
    mapContainerRefs.current.splice(index, 1);
    removeTimeline(index);
  };

  const { mutate: add } = useMutation({
    mutationFn: async ({ newProduct, blockchainTxId, nftId }: { newProduct: Omit<Product, 'id' | 'blockchainTxId' | 'nftId'>; blockchainTxId: string; nftId?: string }) => {
      return addProduct(newProduct, blockchainTxId, user?.email || '', nftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Thêm sản phẩm thành công!',
        description: 'Sản phẩm đã được thêm và đồng bộ.',
      });
      form.reset();
      setImagePreview(null);
      setCertificationPreviews({});
    },
    onError: () => {
      toast({
        title: 'Lỗi khi thêm sản phẩm',
        description: 'Đã xảy ra sự cố. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
  });

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('image', file);
    }
  };

  const onCertificationChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificationPreviews(prev => ({ ...prev, [index]: reader.result as string }));
      };
      reader.readAsDataURL(file);
      form.setValue(`certifications.${index}.file`, file);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (connectionStatus !== 'connected' || !currentAccount?.address) {
      toast({
        title: 'Chưa kết nối ví',
        description: 'Vui lòng kết nối ví Sui trước.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Upload image to IPFS
      const imageFormData = new FormData();
      imageFormData.append('file', data.image);
      
      let response = await fetch('http://localhost:3000/upload-ipfs', {
        method: 'POST',
        body: imageFormData,
      });
      if (!response.ok) throw new Error('Lỗi upload ảnh lên IPFS');
      const { cid: imageCid } = await response.json();
      const imageUri = `https://gateway.pinata.cloud/ipfs/${imageCid}`;

      // Step 2: Upload certifications to IPFS
      const certificationsWithIpfs: Certification[] = [];
      if (data.certifications && data.certifications.length > 0) {
        for (const cert of data.certifications) {
          const certFormData = new FormData();
          certFormData.append('file', cert.file);
          
          response = await fetch('http://localhost:3000/upload-ipfs', {
            method: 'POST',
            body: certFormData,
          });
          if (!response.ok) throw new Error('Lỗi upload chứng nhận lên IPFS');
          const { cid: certCid } = await response.json();
          const certUri = `https://gateway.pinata.cloud/ipfs/${certCid}`;
          
          certificationsWithIpfs.push({ name: cert.name, file: certUri });
        }
      }

      // Step 3: Upload certifications JSON to IPFS
      response = await fetch('http://localhost:3000/upload-json-ipfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: certificationsWithIpfs }),
      });
      if (!response.ok) throw new Error('Lỗi upload certifications JSON lên IPFS');
      const { cid: certsCid } = await response.json();
      const certsUri = `https://gateway.pinata.cloud/ipfs/${certsCid}`;

      // Step 4: Upload timeline to IPFS
      response = await fetch('http://localhost:3000/upload-json-ipfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: data.timeline }),
      });
      if (!response.ok) throw new Error('Lỗi upload timeline lên IPFS');
      const { cid: timelineCid } = await response.json();
      const timelineUri = `https://gateway.pinata.cloud/ipfs/${timelineCid}`;

      // Step 5: Mint NFT on Sui blockchain
      const txb = new Transaction();
      
      const tempTxId = `sui-temp-${Date.now()}`;

      txb.moveCall({
        target: `${PACKAGE_ID}::product_nft_v2::mint_product_nft`,
        arguments: [
          // Basic info
          txb.pure.string(data.name),
          txb.pure.string(data.description),
          txb.pure.string(imageUri),
          txb.pure.string(data.origin),
          txb.pure.string(data.farmerName),
          txb.pure.string(data.productionDate),
          
          // Economic params
          txb.pure.u64(data.age),
          txb.pure.u64(Math.floor(data.price * 1000000)), // price in micro units
          txb.pure.u64(data.quantity),
          txb.pure.u64(data.roi),
          txb.pure.u64(data.growthRate),
          
          // IoT data
          txb.pure.string(data.iotStatus),
          txb.pure.u64(data.iotData.height),
          txb.pure.u64(data.iotData.growthPerMonth),
          txb.pure.u64(data.iotData.humidity),
          txb.pure.u64(data.iotData.temperature),
          txb.pure.u64(Math.floor(data.iotData.pH * 100)), // pH in hundredths
          txb.pure.string(data.iotData.lastUpdated),
          
          // URIs
          txb.pure.string(certsUri),
          txb.pure.string(timelineUri),
          txb.pure.string(tempTxId),
          
          // Recipient
          txb.pure.address(currentAccount.address),
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb as any,
          },
          {
            onSuccess: (result) => {
              console.log('✅ NFT Minted on Sui!', result);

              // Extract NFT object ID from transaction result
              let nftObjectId: string | undefined;
              
              try {
                // Access the created objects from the result
                // In Sui SDK, the structure is: result.effects.created
                const effects = (result as any).effects;
                const createdObjects = effects?.created;
                
                if (createdObjects && Array.isArray(createdObjects) && createdObjects.length > 0) {
                  // Find the ProductNFT object (usually the first object sent to user's address)
                  const nftObject = createdObjects.find((obj: any) => {
                    // Check if it's owned by an address (not immutable or shared)
                    return obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner;
                  });
                  
                  if (nftObject && nftObject.reference) {
                    nftObjectId = nftObject.reference.objectId;
                    console.log('NFT Object ID:', nftObjectId);
                  }
                }
              } catch (error) {
                console.error('Error extracting NFT ID:', error);
              }

              // Step 6: Save product to backend
              const newProduct: Omit<Product, 'id' | 'blockchainTxId' | 'nftId'> = {
                name: data.name,
                description: data.description,
                roi: data.roi,
                price: data.price,
                image: imageUri,
                origin: data.origin,
                farmerName: data.farmerName,
                productionDate: data.productionDate,
                timeline: data.timeline,
                certifications: certificationsWithIpfs,
                growthRate: data.growthRate,
                age: data.age,
                iotStatus: data.iotStatus,
                iotData: data.iotData,
              };

              add({ newProduct, blockchainTxId: result.digest, nftId: nftObjectId });

              toast({
                title: 'Mint NFT thành công!',
                description: `NFT đã được mint trên Sui blockchain. Transaction: ${result.digest}`,
              });

              // Reset form and navigate
              form.reset();
              setCertificationPreviews({});
              setIsLoading(false);
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Lỗi khi mint NFT',
        description: `Chi tiết: ${error.message || 'Vui lòng thử lại.'}`,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-3 rounded-lg">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Thêm Sản Phẩm Mới (Sui)</h1>
            <p className="text-gray-600">Mint NFT cho sản phẩm nông nghiệp trên Sui blockchain</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={step} onValueChange={setStep} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Thông tin</TabsTrigger>
                <TabsTrigger value="certifications">Chứng nhận</TabsTrigger>
                <TabsTrigger value="timeline">Hành trình</TabsTrigger>
                <TabsTrigger value="iot">IoT & ROI</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên sản phẩm *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: Sâm Ngọc Linh" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá (VNĐ) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="5000000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Mô tả chi tiết sản phẩm..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xuất xứ *</FormLabel>
                        <FormControl>
                          <Input placeholder="Kon Tum" {...field} />
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
                        <FormLabel>Tên nông dân *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nguyễn Văn A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="productionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày gieo trồng *</FormLabel>
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
                        <FormLabel>Số lượng *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tuổi (năm) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="6"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
                    <FormItem>
                      <FormLabel>Hình ảnh sản phẩm *</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/jpeg,image/png" onChange={onImageChange} />
                      </FormControl>
                      <FormMessage />
                      {imagePreview && (
                        <div className="mt-2">
                          <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg shadow-md" />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 2: Certifications */}
              <TabsContent value="certifications" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Chứng nhận</h3>
                  <Button
                    type="button"
                    onClick={() => appendCertification({ name: '', file: null })}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm chứng nhận
                  </Button>
                </div>

                {certificationFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <FormField
                        control={form.control}
                        name={`certifications.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1 mr-4">
                            <FormLabel>Tên chứng nhận</FormLabel>
                            <FormControl>
                              <Input placeholder="VietGAP" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        onClick={() => removeCertification(index)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`certifications.${index}.file`}
                      render={() => (
                        <FormItem>
                          <FormLabel>File chứng nhận</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              onChange={(e) => onCertificationChange(index, e)}
                            />
                          </FormControl>
                          <FormMessage />
                          {certificationPreviews[index] && (
                            <div className="mt-2">
                              <img
                                src={certificationPreviews[index]!}
                                alt="Preview"
                                className="max-w-xs rounded-lg shadow-md"
                              />
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                {certificationFields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Chưa có chứng nhận nào. Nhấn "Thêm chứng nhận" để bắt đầu.</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Timeline */}
              <TabsContent value="timeline" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Hành trình sản phẩm</h3>
                  <Button type="button" onClick={() => appendTimeline({ title: '', desc: '', date: '', location: '', lat: undefined, lng: undefined, responsible: '', details: '' })} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Thêm mốc
                  </Button>
                </div>

                {timelineFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-5 space-y-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-lg">Mốc {index + 1}</h4>
                      <Button type="button" onClick={() => handleRemove(index)} variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`timeline.${index}.title`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tiêu đề</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name={`timeline.${index}.date`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ngày</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name={`timeline.${index}.desc`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl><Textarea {...field} rows={2} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`timeline.${index}.location`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Địa điểm</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  debounce(() => fetchSuggestions(e.target.value, index), 300)();
                                }}
                                placeholder="Nhập địa chỉ..."
                              />
                              {showSuggestions[index] && addressSuggestions[index]?.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-48 overflow-auto shadow-lg">
                                  {addressSuggestions[index].map((sug, i) => (
                                    <li
                                      key={i}
                                      className="p-2 hover:bg-gray-100 cursor-pointer"
                                      onClick={() => {
                                        const addr = sug.description || sug.terms?.map((t: any) => t.value).join(', ') || '';
                                        form.setValue(`timeline.${index}.location`, addr);
                                        setShowSuggestions(prev => ({ ...prev, [index]: false }));
                                        geocodeLocation(addr, index);
                                      }}
                                    >
                                      {sug.description || sug.terms?.map((t: any) => t.value).join(', ')}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="flex items-end gap-2">
                        <FormField control={form.control} name={`timeline.${index}.responsible`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Người phụ trách</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => geocodeLocation(form.getValues(`timeline.${index}.location`), index)}
                          disabled={isSearching[index]}
                        >
                          {isSearching[index] ? 'Đang tìm...' : 'Tìm tọa độ'}
                        </Button>
                      </div>
                    </div>

                    {/* Bản đồ */}
                    <div className="mt-3">
                      {mapErrors[index] ? (
                        <div className="h-[220px] bg-red-50 flex items-center justify-center text-red-600 rounded border">
                          {mapErrors[index]}
                        </div>
                      ) : (
                        <div
                          ref={el => { mapContainerRefs.current[index] = el; }}
                          id={`map-timeline-${index}`}
                          className="w-full h-[220px] rounded border overflow-hidden bg-gray-100"
                        />
                      )}
                    </div>

                    <FormField control={form.control} name={`timeline.${index}.details`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chi tiết (tùy chọn)</FormLabel>
                        <FormControl><Textarea {...field} rows={2} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                ))}
              </TabsContent>

              {/* Tab 4: IoT & ROI */}
              <TabsContent value="iot" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">ROI & Tăng trưởng</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ROI (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="15"
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
                      name="growthRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tỷ lệ tăng trưởng (%/năm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="15.2"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <h3 className="text-lg font-semibold mt-6">Dữ liệu IoT</h3>

                  <FormField
                    control={form.control}
                    name="iotStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trạng thái IoT</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Đang theo dõi">Đang theo dõi</SelectItem>
                            <SelectItem value="Ngưng theo dõi">Ngưng theo dõi</SelectItem>
                            <SelectItem value="Lỗi cảm biến">Lỗi cảm biến</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="iotData.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chiều cao (cm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="120"
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
                      name="iotData.growthPerMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tăng trưởng (cm/tháng)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5.2"
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
                      name="iotData.humidity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Độ ẩm (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="65"
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
                      name="iotData.temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nhiệt độ (°C)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="18"
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
                      name="iotData.pH"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>pH</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="6.5"
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
                      name="iotData.lastUpdated"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cập nhật cuối</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {connectionStatus !== 'connected' && (
                  <span className="text-red-500">⚠️ Vui lòng kết nối ví Sui</span>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading || connectionStatus !== 'connected'}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {isLoading ? 'Đang xử lý...' : 'Mint NFT & Thêm sản phẩm'}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </DashboardLayout>
  );
};

export default AddProductSui;
