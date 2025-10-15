import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "./card";
import { Button } from "./button";
import { Link } from "react-router-dom";
import { Leaf, Globe2 } from "lucide-react";
import type { CarbonCredit } from "../../types/types";

const CarbonCard = ({ credit }: { credit: CarbonCredit }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.25 }}
    className="group relative flex flex-col"
  >
    <Card className="flex flex-col h-full backdrop-blur-xl bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 border border-blue-200 dark:border-blue-700 shadow-md rounded-2xl overflow-hidden hover:shadow-2xl transition-all">
      {/* --- Hình ảnh & Tag --- */}
      <CardHeader className="relative p-0">
        <img
          src={credit.image}
          alt={credit.name}
          className="w-full h-56 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 bg-blue-700 text-white text-xs px-3 py-1 rounded-full shadow">
          Tín chỉ Carbon
        </div>
      </CardHeader>

      {/* --- Nội dung chính --- */}
      <CardContent className="flex flex-col flex-grow justify-between p-5 text-center">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 leading-snug min-h-[56px] flex items-center justify-center line-clamp-2">
            {credit.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug min-h-[40px] flex items-center justify-center">
            {credit.projectType} | {credit.origin}
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 min-h-[48px] flex items-center justify-center">
            {credit.pricePerTon.toLocaleString("vi-VN")} VNĐ/tấn
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 min-h-[28px] flex items-center justify-center">
            Hấp thụ: {credit.co2OffsetTons.toLocaleString("vi-VN")} tấn/năm
          </p>
        </div>

        {/* --- Nút CTA cố định đáy --- */}
        <Link to={`/carbon-credit/${credit.id}`} className="mt-4 block">
          <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-full">
            <Globe2 className="w-4 h-4 mr-2" /> Xem dự án
          </Button>
        </Link>
      </CardContent>
    </Card>
  </motion.div>
);

export default CarbonCard;