import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

const schema = z.object({
  email: z.string().email({ message: "Email không hợp lệ" }),
  password: z.string().min(6, { message: "Mật khẩu ít nhất 6 ký tự" }),
  role: z.enum(["farmer", "customer"]),
});

type FormData = z.infer<typeof schema>;

const Register = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", role: "customer" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("userEmail", userCredential.user.email || "");
      window.location.href = data.role === "farmer" ? "/farmer/dashboard" : "/customer/shop";
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
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
              <Leaf className="w-8 h-8 mr-2" /> Đăng ký tài khoản
            </h2>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="Nhập email..." {...field} /></FormControl>
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
                  <FormControl><Input type="password" placeholder="Nhập mật khẩu..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò</FormLabel>
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

            <Button type="submit" className="w-full rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
              Đăng ký
            </Button>
          </form>
        </Form>

        <div className="flex justify-center mt-4">
          <WalletMultiButton className="w-full justify-center bg-green-600 hover:bg-green-700 text-white rounded-full" />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-300">
          Đã có tài khoản?{" "}
          <a href="/login" className="text-green-600 hover:underline">
            Đăng nhập
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;