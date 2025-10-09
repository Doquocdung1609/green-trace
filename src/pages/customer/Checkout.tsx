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
import ToastNotification from "../../components/ui/ToastNotification"; // ✅ thêm import

const schema = z.object({
  name: z.string().min(1, "Nhập họ tên"),
  address: z.string().min(1, "Nhập địa chỉ giao hàng"),
  payment: z.enum(["cod", "solana"]),
});

type FormData = z.infer<typeof schema>;

const Checkout = () => {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  // ✅ State để điều khiển Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const onSubmit = (data: FormData) => {
    try {
      localStorage.removeItem("cart");
      setToastMessage(`✅ Đặt hàng thành công!\nTên: ${data.name}\nThanh toán: ${data.payment}`);
      setToastType("success");
      setToastVisible(true);
      form.reset(); // reset form sau khi submit
    } catch (error) {
      setToastMessage("❌ Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại!");
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
        className="p-6 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6 text-green-700 dark:text-green-400">
          🧾 Thanh toán
        </h1>
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ giao hàng</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <select
                    {...field}
                    className="border p-2 rounded-lg w-full focus:ring-green-500"
                  >
                    <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                    <option value="solana">Ví Solana</option>
                  </select>
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
