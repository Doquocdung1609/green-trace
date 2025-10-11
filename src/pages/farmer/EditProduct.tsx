import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProductById, updateProduct } from '../../services/api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { motion } from 'framer-motion';
import { Leaf, Plus, Trash2 } from 'lucide-react';
import { Toaster } from '../../components/ui/toaster';
import { toast } from '../../hooks/use-toast';
import type { Product, Certification, TimelineEntry } from '../../types/types';
import React from 'react';

const schema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  description: z.string().min(10, 'Mô tả phải ít nhất 10 ký tự'),
  price: z.number().positive('Giá phải lớn hơn 0'),
  image: z.any().refine(
    (value) => typeof value === 'string' || (value instanceof File && ['image/jpeg', 'image/png'].includes(value.type)),
    { message: 'Vui lòng tải lên tệp ảnh JPEG hoặc PNG hoặc giữ nguyên ảnh hiện tại' }
  ),
  origin: z.string().min(1, 'Xuất xứ là bắt buộc'),
  farmerName: z.string().min(1, 'Tên nông dân là bắt buộc'),
  productionDate: z.string().min(1, 'Ngày sản xuất là bắt buộc'),
  quantity: z.number().nonnegative('Số lượng phải lớn hơn hoặc bằng 0'),
  certifications: z.array(
    z.object({
      name: z.string().min(1, 'Tên chứng nhận là bắt buộc'),
      file: z.any().refine(
        (value) => typeof value === 'string' || (value instanceof File && ['image/jpeg', 'image/png', 'application/pdf'].includes(value.type)),
        { message: 'Vui lòng tải lên tệp JPEG, PNG hoặc PDF hoặc giữ nguyên tệp hiện tại' }
      ),
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

const TRACK_ASIA_ACCESS_TOKEN = import.meta.env.VITE_TRACK_ASIA_ACCESS_TOKEN || "YOUR_TRACK_ASIA_ACCESS_TOKEN";

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState('info');
  const [addressSuggestions, setAddressSuggestions] = useState<{ [key: number]: any[] }>({});
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const locationRefs = useRef<React.MutableRefObject<HTMLInputElement | null>[]>([]);

  const { data: product, isLoading, error } = useQuery<Product | null>({
    queryKey: ['product', id],
    queryFn: () => fetchProductById(id!),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product || {
      name: '',
      description: '',
      price: 0,
      image: '',
      origin: '',
      farmerName: '',
      productionDate: '',
      quantity: 0,
      certifications: [],
      timeline: [],
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

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        origin: product.origin,
        farmerName: product.farmerName,
        productionDate: product.productionDate,
        quantity: product.quantity,
        certifications: product.certifications,
        timeline: product.timeline,
      });
    }
  }, [product, form]);

  // TrackAsia Geocoding API for timeline location autocomplete
  useEffect(() => {
    // Initialize refs for each timeline field
    locationRefs.current = timelineFields.map((_, index) => locationRefs.current[index] || { current: null });

    const fetchSuggestions = async (query: string, index: number) => {
      if (!query) {
        setAddressSuggestions((prev) => ({ ...prev, [index]: [] }));
        setShowSuggestions((prev) => ({ ...prev, [index]: false }));
        return;
      }

      try {
        const response = await fetch(
          `https://api.track-asia.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TRACK_ASIA_ACCESS_TOKEN}&country=vn&types=address,place`
        );
        const data = await response.json();
        setAddressSuggestions((prev) => ({ ...prev, [index]: data.features || [] }));
        setShowSuggestions((prev) => ({ ...prev, [index]: true }));
      } catch (error) {
        toast({
          title: 'Lỗi khi tải gợi ý địa chỉ',
          description: 'Vui lòng thử lại sau.',
          variant: 'destructive',
        });
      }
    };

    const handleInputChange = (index: number) => (e: Event) => {
      const target = e.target as HTMLInputElement;
      fetchSuggestions(target.value, index);
    };

    timelineFields.forEach((_, index) => {
      const input = locationRefs.current[index]?.current;
      if (input) {
        input.addEventListener('input', handleInputChange(index));
      }
    });

    return () => {
      timelineFields.forEach((_, index) => {
        const input = locationRefs.current[index]?.current;
        if (input) {
          input.removeEventListener('input', handleInputChange(index));
        }
      });
    };
  }, [timelineFields]);

  const handleSelectSuggestion = (suggestion: any, index: number) => {
    form.setValue(`timeline.${index}.location`, suggestion.place_name);
    form.setValue(`timeline.${index}.lat`, suggestion.geometry.coordinates[1]);
    form.setValue(`timeline.${index}.lng`, suggestion.geometry.coordinates[0]);
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
    setAddressSuggestions((prev) => ({ ...prev, [index]: [] }));
  };

  const { mutate: update } = useMutation({
    mutationFn: async (data: FormData) => {
      if (!id) return;
      const image = typeof data.image === 'string' ? data.image : await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data.image);
      });

      const certifications = await Promise.all(
        (data.certifications || []).map(async (cert) => ({
          name: cert.name,
          file: typeof cert.file === 'string' ? cert.file : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(cert.file);
          }),
        }))
      );

      const updatedProduct: Product = {
        ...product!,
        ...data,
        id,
        image,
        certifications,
        timeline: data.timeline,
        blockchainTxId: product!.blockchainTxId,
      };
      return updateProduct(updatedProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Cập nhật sản phẩm thành công!',
        description: 'Sản phẩm đã được cập nhật.',
      });
      navigate('/farmer/products');
    },
    onError: () => {
      toast({
        title: 'Lỗi khi cập nhật sản phẩm',
        description: 'Đã xảy ra sự cố. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormData) => {
    update(data);
  };

  if (isLoading) return <p className="p-6 text-center">Đang tải dữ liệu...</p>;
  if (error || !product) return <p className="p-6 text-red-500 text-center">Sản phẩm không tồn tại</p>;

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
          <Leaf className="w-8 h-8 mr-2 text-green-600" />
          Chỉnh sửa sản phẩm
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
                          {typeof field.value === 'string' && field.value && (
                            <img src={field.value} alt="Current product" className="w-32 h-32 object-cover mb-2" />
                          )}
                          <Input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : field.value)}
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
                      <FormLabel>Số lượng</FormLabel>
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
                              <div className="relative">
                                <Input
                                  id={`location-${index}`}
                                  placeholder="Nhập địa điểm..."
                                  {...field}
                                  ref={(el) => {
                                    locationRefs.current[index] = { current: el };
                                  }}
                                />
                                {showSuggestions[index] && addressSuggestions[index]?.length > 0 && (
                                  <ul className="absolute z-10 bg-white dark:bg-gray-800 border rounded-md mt-1 w-full max-h-60 overflow-y-auto">
                                    {addressSuggestions[index].map((suggestion) => (
                                      <li
                                        key={suggestion.id}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                        onClick={() => handleSelectSuggestion(suggestion, index)}
                                      >
                                        {suggestion.place_name}
                                      </li>
                                    ))}
                                  </ul>
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
                          onClick={() => removeTimeline(index)}
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
                    onClick={() =>
                      appendTimeline({
                        title: '',
                        desc: '',
                        date: '',
                        location: '',
                        responsible: '',
                        details: '',
                      })
                    }
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
                              <div>
                                {typeof field.value === 'string' && field.value && (
                                  <div className="mb-2">
                                    {field.value.startsWith('data:image') ? (
                                      <img src={field.value} alt="Certification" className="w-32 h-32 object-cover" />
                                    ) : (
                                      <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                        Xem tệp chứng nhận
                                      </a>
                                    )}
                                  </div>
                                )}
                                <Input
                                  type="file"
                                  accept="image/jpeg,image/png,application/pdf"
                                  onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : field.value)}
                                />
                              </div>
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

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 mt-4"
              >
                Cập nhật sản phẩm
              </Button>
            </form>
          </Form>
        </Tabs>

        <Toaster />
      </motion.div>
    </DashboardLayout>
  );
};

export default EditProduct;