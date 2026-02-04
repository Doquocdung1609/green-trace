import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Leaf, ArrowLeft, ArrowRight } from "lucide-react";
import ToastNotification from "../../components/ui/ToastNotification";
import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { useAuth } from "../../contexts/AuthContext";
import { Form, FormControl, FormField, FormItem, FormMessage } from "../../components/ui/form";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const schema = z
  .object({
    email: z.string().trim().min(1, "Không được bỏ trống ô này").email("Email không hợp lệ"),
    password: z.string().trim().min(6, "Mật khẩu ít nhất 6 ký tự"),
    role: z.enum(["farmer", "customer"]),
    fullName: z.string().trim().min(3, "Họ tên phải có ít nhất 3 ký tự"),
    phone: z.string().trim().min(9, "Số điện thoại không hợp lệ"),
    address: z.string().trim().min(5, "Địa chỉ không hợp lệ"),
    farmName: z.string().trim().optional(),
    bio: z.string().trim().optional(),
    kycId: z.string().trim().optional(),
    suiAddress: z.string().trim().optional(),
  })
  .refine((data) => (data.role === "farmer" ? !!data.farmName : true), {
    message: "Tên trang trại là bắt buộc với vai trò nông dân",
    path: ["farmName"],
  });

type FormData = z.infer<typeof schema>;

const Register = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      role: "customer",
      fullName: "",
      phone: "",
      address: "",
      farmName: "",
      bio: "",
      kycId: "",
      suiAddress: "",
    },
  });

  const { setUser } = useAuth();
  const [step, setStep] = React.useState(1);
  const [notif, setNotif] = React.useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "info",
  });

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data };
      const response = await fetch("https://server-x0u1.onrender.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).error || "Lỗi khi đăng ký");

      const user = await response.json();
      setUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));
      setNotif({
        visible: true,
        message: `🎉 Đăng ký thành công! Chào mừng ${user.name}!`,
        type: "success",
      });

      setTimeout(() => {
        window.location.href = user.role === "farmer" ? "/farmer/dashboard" : "/shop";
      }, 1200);
    } catch (error: any) {
      setNotif({ visible: true, message: error.message, type: "error" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-100 to-green-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg p-8 rounded-2xl shadow-2xl bg-white/90 dark:bg-gray-800/80 backdrop-blur-md border border-green-200 dark:border-green-700"
      >
        <h2 className="text-3xl font-bold text-center text-green-600 dark:text-green-400 mb-6 flex items-center justify-center">
          <Leaf className="w-8 h-8 mr-2" /> Đăng ký tài khoản
        </h2>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <motion.div
            className="bg-green-500 h-2 rounded-full"
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mật khẩu</label>
                      <FormControl>
                        <Input type="password" placeholder="Nhập mật khẩu..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vai trò</label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn vai trò" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="farmer">👨‍🌾 Nông dân</SelectItem>
                          <SelectItem value="customer">🛒 Khách hàng</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center"
                  >
                    Tiếp tục <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Họ và tên</label>
                      <FormControl>
                        <Input placeholder="Nhập họ tên..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Số điện thoại</label>
                      <FormControl>
                        <Input placeholder="Nhập số điện thoại..." {...field} />
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Địa chỉ</label>
                      <FormControl>
                        <Input placeholder="Nhập địa chỉ..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("role") === "farmer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="farmName"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tên trang trại</label>
                          <FormControl>
                            <Input placeholder="Nhập tên trang trại..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Giới thiệu</label>
                          <FormControl>
                            <Textarea placeholder="Giới thiệu ngắn gọn..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="kycId"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mã định danh KYC / CCCD</label>
                      <FormControl>
                        <Input placeholder="Nhập mã định danh..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between">
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="rounded-full flex items-center"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" /> Quay lại
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full bg-green-500 hover:bg-green-600 text-white"
                  >
                    Đăng ký
                  </Button>
                </div>
              </motion.div>
            )}
          </form>
        </Form>

        <div className="flex justify-center mt-6">
          <ConnectButton className="w-full" />
        </div>

        <p className="text-center text-sm mt-4 text-gray-500 dark:text-gray-300">
          Đã có tài khoản?{" "}
          <a href="/login" className="text-green-600 hover:underline">Đăng nhập</a>
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

export default Register;