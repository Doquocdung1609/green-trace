import React, { useState } from "react";
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
import ToastNotification from "../../components/ui/ToastNotification"; // ✅ Thêm import

const schema = z.object({
  name: z.string().min(1, "Nhập tên"),
  email: z.string().email("Email không hợp lệ"),
  address: z.string().min(1, "Nhập địa chỉ"),
});

type FormData = z.infer<typeof schema>;

const Profile = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "Nguyễn Văn A", email: "a@gmail.com", address: "Hà Nội" },
  });

  // ✅ State điều khiển Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const onSubmit = (data: FormData) => {
    try {
      // Giả lập cập nhật thành công
      setToastMessage(`🎉 Đã cập nhật hồ sơ!\nTên: ${data.name}\nEmail: ${data.email}`);
      setToastType("success");
      setToastVisible(true);
    } catch (error) {
      setToastMessage("❌ Có lỗi xảy ra khi lưu hồ sơ!");
      setToastType("error");
      setToastVisible(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* ✅ Hiển thị Toast */}
      <ToastNotification
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />

      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 max-w-lg mx-auto"
      >
        <h1 className="text-4xl font-bold mb-6 text-green-700 dark:text-green-400">
          👤 Hồ sơ cá nhân
        </h1>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 bg-card p-6 rounded-2xl shadow-lg"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-green-600 text-white hover:bg-green-700 py-3 rounded-xl"
            >
              Lưu thay đổi
            </Button>
          </form>
        </Form>
      </motion.section>
    </div>
  );
};

export default Profile;
