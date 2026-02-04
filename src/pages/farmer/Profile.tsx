import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import ToastNotification from '../../components/ui/ToastNotification';
import DashboardLayout from '../../layouts/DashboardLayout';

const schema = z.object({
  fullName: z.string().min(3, 'Họ tên phải có ít nhất 3 ký tự'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ không hợp lệ'),
  farmName: z.string().min(2, 'Tên trang trại không hợp lệ'),
  bio: z.string().optional(),
  suiAddress: z.string().optional(),
  kycId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const Profile = () => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const currentAccount = useCurrentAccount();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      farmName: '',
      bio: '',
      suiAddress: '',
      kycId: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const profileData = {
        ...data,
        suiAddress: currentAccount?.address || data.suiAddress,
      };

      console.log('Dữ liệu profile:', profileData);
      localStorage.setItem('farmerProfile', JSON.stringify(profileData));

      setToast({
        visible: true,
        message: '🎉 Cập nhật hồ sơ thành công!',
        type: 'success',
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật hồ sơ:', error);
      setToast({
        visible: true,
        message: '❌ Đã xảy ra lỗi khi lưu thông tin!',
        type: 'error',
      });
    }
  };

  return (
    <DashboardLayout role="farmer">
      <ToastNotification
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
        type={toast.type}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
          <User className="w-8 h-8 mr-2 text-green-600" />
          Hồ sơ nông dân
        </h1>

        <Tabs defaultValue="info" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-200 dark:border-green-700">
          <TabsList className="mb-6">
            <TabsTrigger value="info">Thông tin cá nhân</TabsTrigger>
            <TabsTrigger value="kyc">Xác minh KYC</TabsTrigger>
            <TabsTrigger value="wallet">Ví Sui</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="info" className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl><Input placeholder="Nhập họ và tên..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl><Input placeholder="Nhập số điện thoại..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl><Input placeholder="Nhập địa chỉ..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="farmName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên trang trại</FormLabel>
                    <FormControl><Input placeholder="Tên trang trại (VD: Nông trại Xanh...)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giới thiệu</FormLabel>
                    <FormControl><Textarea placeholder="Giới thiệu ngắn gọn về bạn và trang trại..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="kyc" className="space-y-4">
                <FormField control={form.control} name="kycId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã định danh KYC / CCCD</FormLabel>
                    <FormControl><Input placeholder="Nhập số CCCD hoặc mã KYC..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  * Thông tin này giúp xác minh danh tính và tăng độ tin cậy cho NFT của bạn.
                </p>
              </TabsContent>

              <TabsContent value="wallet" className="space-y-4">
                {!currentAccount ? (
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      Kết nối ví Sui để mint NFT và quản lý sản phẩm.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200 dark:border-green-600">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Ví đã kết nối: <br />
                      <span className="font-mono text-xs break-all">{currentAccount?.address}</span>
                    </p>
                  </div>
                )}
              </TabsContent>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
