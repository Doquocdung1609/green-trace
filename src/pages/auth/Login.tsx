import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import ToastNotification from "../../components/ui/ToastNotification";
import { useAuth } from "../../contexts/AuthContext";

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

  const { setUser } = useAuth(); // Lấy setUser từ AuthContext

  const [notif, setNotif] = React.useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "info",
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Sai thông tin đăng nhập");
      }

      const user = await response.json();
      setUser(user); // Cập nhật user trong AuthContext
      localStorage.setItem("currentUser", JSON.stringify(user)); // Lưu user vào localStorage
      setNotif({ visible: true, message: `🌿 Chào mừng ${user.name}!`, type: "success" });

      setTimeout(() => {
        window.location.href = user.role === "farmer" ? "/farmer/dashboard" : "/shop";
      }, 1200);
    } catch (error: any) {
      setNotif({ visible: true, message: error.message, type: "error" });
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-green-600 dark:text-green-400 flex items-center justify-center">
              <Leaf className="w-8 h-8 mr-2" /> Đăng nhập
            </h2>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập email..." {...field} />
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
                    <Input type="password" placeholder="Nhập mật khẩu..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              Đăng nhập
            </Button>
          </form>
        </Form>

        <div className="flex justify-center mt-4">
          <WalletMultiButton className="w-full justify-center bg-green-600 hover:bg-green-700 text-white rounded-full" />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-300">
          Chưa có tài khoản?{" "}
          <a href="/register" className="text-green-600 hover:underline">
            Đăng ký
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