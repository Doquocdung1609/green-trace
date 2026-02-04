import { useState } from 'react';
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

const PACKAGE_ID = '0x18c4900231904503471f9a056057d9f8369924d4174cf62986368ac8f7e1e0e1';

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

  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { mutate: add } = useMutation({
    mutationFn: async ({ newProduct, blockchainTxId }: { newProduct: Omit<Product, 'id' | 'blockchainTxId'>; blockchainTxId: string }) => {
      return addProduct(newProduct, blockchainTxId, user?.email || '');
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
        target: `${PACKAGE_ID}::advanced_product_nft::mint_product_nft`,
        arguments: [
          // Registry (shared object)
          txb.object('0xc2ebceb5f68416005a128ac55e4a60a0b62a9cf287639ea8f135ff186c439ea0'),
          
          // Basic info
          txb.pure.string(data.name),
          txb.pure.string(data.description),
          txb.pure.string(imageUri),
          txb.pure.string(data.origin),
          txb.pure.string(data.farmerName),
          txb.pure.string(data.productionDate),
          
          // Economic params
          txb.pure.u64(BigInt(data.age)),
          txb.pure.u64(BigInt(Math.floor(data.price * 1000000))), // base_price
          txb.pure.u64(BigInt(data.roi)),
          txb.pure.u64(BigInt(data.growthRate)),
          txb.pure.u64(BigInt(1000000)), // monthly_maintenance_fee (default 1 SUI)
          
          // Transfer type (0: Direct)
          txb.pure.u8(0),
          
          // IoT data
          txb.pure.string(data.iotStatus),
          txb.pure.u64(BigInt(data.iotData.height)),
          txb.pure.u64(BigInt(data.iotData.humidity)),
          txb.pure.u64(BigInt(data.iotData.temperature)),
          
          // URIs
          txb.pure.string(certsUri),
          txb.pure.string(timelineUri),
          txb.pure.string(tempTxId), // metadata_uri
          
          // Recipient
          txb.pure.address(currentAccount.address),
          
          // Clock
          txb.object('0x6'),
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

              // Step 6: Save product to backend
              const newProduct: Omit<Product, 'id' | 'blockchainTxId'> = {
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

              add({ newProduct, blockchainTxId: result.digest });

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
                        <FormLabel>Ngày sản xuất *</FormLabel>
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
              <TabsContent value="timeline" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Hành trình sản phẩm</h3>
                  <Button
                    type="button"
                    onClick={() => appendTimeline({ title: '', desc: '', date: '', location: '', responsible: '', details: '' })}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm mốc
                  </Button>
                </div>

                {timelineFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Mốc {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeTimeline(index)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`timeline.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiêu đề</FormLabel>
                            <FormControl>
                              <Input placeholder="Trồng trọt" {...field} />
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
                    </div>

                    <FormField
                      control={form.control}
                      name={`timeline.${index}.desc`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mô tả</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Mô tả chi tiết..." rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`timeline.${index}.location`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Địa điểm</FormLabel>
                            <FormControl>
                              <Input placeholder="Kon Tum" {...field} />
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
                              <Input placeholder="Nguyễn Văn A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`timeline.${index}.details`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chi tiết (tùy chọn)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Thông tin bổ sung..." rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
