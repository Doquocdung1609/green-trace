import Header from "../../components/ui/Header";
import Footer from "../../components/ui/Footer";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";

const Contact = () => (
  <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
    <Header />
    <section className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold text-center text-green-700 dark:text-green-400 mb-8">Liên hệ với chúng tôi</h1>
      <form className="space-y-4 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow">
        <Input placeholder="Họ và tên" />
        <Input placeholder="Email" type="email" />
        <Textarea placeholder="Nội dung tin nhắn..." />
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">Gửi</Button>
      </form>

      <div className="mt-8 text-center">
        <iframe
          title="Google Map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.669097741086!2d106.67998347480558!3d10.75991828938387!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f3b0a86e799%3A0xf89d9a7561a3422e!2zQ8O0bmcgVHkgVE5ISCBIb8Ogbmc!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
          width="100%"
          height="350"
          className="rounded-xl border-none shadow"
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
    </section>
    <Footer />
  </div>
);

export default Contact;
