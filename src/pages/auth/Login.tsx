import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import ToastNotification from "../../components/ui/ToastNotification";
import { useAuth } from "../../contexts/AuthContext";
import { ConnectButton } from "@mysten/dapp-kit";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Không được bỏ trống ô này" })
    .email({ message: "Email không hợp lệ" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Không được bỏ trống ô này" })
    .min(6, { message: "Mật khẩu ít nhất 6 ký tự" }),
});

type FormData = z.infer<typeof schema>;

const Login = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { setUser } = useAuth();

  const [notif, setNotif] = React.useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "info",
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch("https://server-x0u1.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Sai thông tin đăng nhập");
      }

      const user = await response.json();

      // Lưu user vào context và localStorage
      setUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      setNotif({
        visible: true,
        message: `Chào mừng ${user.name}!`,
        type: "success",
      });

      // Chuyển hướng sau một chút delay để người dùng thấy toast
      setTimeout(() => {
        window.location.href = user.role === "farmer" ? "/farmer/dashboard" : "/shop";
      }, 1500);
    } catch (error: any) {
      setNotif({ visible: true, message: error.message || "Đã có lỗi xảy ra", type: "error" });
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-100 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-96 p-8 rounded-2xl shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-green-200 dark:border-green-700 space-y-6"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
            <Leaf className="w-8 h-8" />
            Đăng nhập
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Quản lý nông sản thông minh trên Blockchain
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="nhập email của bạn..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="nhập mật khẩu..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium"
            >
              Đăng nhập bằng Email
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">Hoặc</span>
          </div>
        </div>

        <div className="space-y-3">
          <ConnectButton className="!w-full" />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-300">
          Chưa có tài khoản?{" "}
          <a href="/register" className="text-green-600 hover:underline font-medium">
            Đăng ký ngay
          </a>
        </p>
      </motion.div>

      <ToastNotification
        message={notif.message}
        visible={notif.visible}
        onClose={() => setNotif({ ...notif, visible: false })}
        type={notif.type}
      />
    </div>
  );
};

export default Login;