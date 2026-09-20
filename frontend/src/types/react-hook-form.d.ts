declare module 'react-hook-form' {
  export function useForm<TFieldValues extends Record<string, any> = Record<string, any>, TContext = any>(props?: any): any;
  export function useFormContext<TFieldValues extends Record<string, any> = Record<string, any>, TContext = any>(): any;
  export function useController(props: any): any;
  export function useFieldArray(props: any): any;
  export function useWatch(props: any): any;
  export function useFormState(props: any): any;
  export function Controller(props: any): any;
  export function Form(props: any): any;
  export function FormProvider(props: any): any;
  export const FormState: any;
  export function FieldArray(props: any): any;
}

declare module 'framer-motion' {
  export const motion: any;
  export const AnimatePresence: any;
  export function useAnimation(): any;
  export function useMotionValue(val: any): any;
  export function useTransform(input: any, inputRange: any, outputRange: any): any;
  export function useSpring(val: any, config?: any): any;
}

declare module '@tanstack/react-query' {
  export function useQuery(options: any): any;
  export function useMutation(options: any): any;
  export function useQueryClient(): any;
  export class QueryClient {
    constructor(options?: any);
  }
  export function QueryClientProvider(props: any): any;
  export function useInfiniteQuery(options: any): any;
}

declare module '@hookform/resolvers/zod' {
  export function zodResolver(schema: any): any;
}

declare module 'swiper/react' {
  export const Swiper: any;
  export const SwiperSlide: any;
}

declare module 'swiper/modules' {
  export const Navigation: any;
  export const Pagination: any;
  export const Autoplay: any;
  export const Thumbs: any;
  export const FreeMode: any;
}

declare module 'socket.io-client' {
  export function io(url?: string, options?: any): any;
  export type Socket = any;
}

declare module 'sonner' {
  export const Toaster: any;
  export function toast(options: any): any;
  export namespace toast {
    function success(message: string, options?: any): void;
    function error(message: string, options?: any): void;
    function warning(message: string, options?: any): void;
    function info(message: string, options?: any): void;
    function dismiss(toastId?: string): void;
  }
}

declare module 'recharts' {
  export const LineChart: any;
  export const Line: any;
  export const BarChart: any;
  export const Bar: any;
  export const AreaChart: any;
  export const Area: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const ResponsiveContainer: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const Legend: any;
}
