import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { RatingStars } from "@/components/ui/RatingStars";
import type { CourseFull } from "@/types/database";

const GRADIENTS = [
  "from-indigo-400 to-brand-600",
  "from-trust-400 to-teal-600",
  "from-sky-400 to-indigo-600",
  "from-brand-400 to-violet-600",
];

interface Props {
  course: CourseFull;
  index?: number;
  rating?: number | null;
  reviewCount?: number | null;
  enrollCount?: number | null;
}

export function CourseCard({ course, index = 0, rating, reviewCount, enrollCount }: Props) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <Link href={`/courses/${course.id}`}
      className="card flex flex-col overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <GraduationCap className="h-12 w-12 text-white/90 group-hover:scale-110 transition-transform" />
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-600 transition-colors leading-snug">
          {course.title}
        </h3>

        <p className="text-lg font-bold text-brand-600">{formatPrice(course.price, course.currency)}</p>

        <div className="flex items-center gap-3">
          <RatingStars rating={rating ?? null} count={reviewCount} />
          {enrollCount != null && enrollCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="h-3 w-3" /> {enrollCount} enrolled
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-gray-50 text-xs text-gray-500 truncate">
          {course.seller?.full_name ?? "Instructor"}
        </div>
      </div>
    </Link>
  );
}
