import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { mintNFT } from '../../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  description: z.string().min(10, 'Mô tả phải ít nhất 10 ký tự'),
  price: z.number().positive('Giá phải lớn hơn 0'),
  image: z.string().url('URL hình ảnh không hợp lệ'),
  gps: z.string().min(1, 'Vị trí GPS là bắt buộc'),
  harvestDate: z.string().min(1, 'Ngày thu hoạch là bắt buộc'),
});

type FormData = z.infer<typeof schema>;

const AddProduct = () => {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const [step, setStep] = useState('info');
  const wallet = useWallet();

  const onSubmit = async (data: FormData) => {
    if (!wallet.connected) return alert('Kết nối ví trước');
    const txId = await mintNFT(data, wallet);
    alert(`NFT đã mint: ${txId}`);
    // Lưu vào backend
  };

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
          <Leaf className="w-8 h-8 mr-2 text-green-600" />
          Thêm sản phẩm mới
        </h1>
        <Tabs value={step} onValueChange={setStep} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-200 dark:border-green-700">
          <TabsList className="mb-6 justify-start">
            <TabsTrigger value="info">Thông tin cơ bản</TabsTrigger>
            <TabsTrigger value="details">Chi tiết sản phẩm</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
          </TabsList>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="info" className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên sản phẩm</FormLabel>
                    <FormControl><Input placeholder="Nhập tên sản phẩm..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl><Textarea placeholder="Mô tả sản phẩm..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá (VNĐ)</FormLabel>
                    <FormControl><Input type="number" placeholder="Nhập giá..." {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>
              <TabsContent value="details" className="space-y-4">
                <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL hình ảnh</FormLabel>
                    <FormControl><Input placeholder="Nhập URL hình ảnh..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gps" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vị trí GPS</FormLabel>
                    <FormControl><Input placeholder="Nhập tọa độ GPS..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="harvestDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày thu hoạch</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>
              <TabsContent value="blockchain" className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">Kết nối ví để mint NFT cho sản phẩm.</p>
                <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">Mint NFT</Button>
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
};

export default AddProduct;