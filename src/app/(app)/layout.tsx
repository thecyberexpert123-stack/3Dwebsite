/** Full-screen tools (the 3D studio and the maker's viewer): no nav, no
 *  loading door, native scroll. Each page brings its own furniture. */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main id="main" className="min-h-[100dvh]">{children}</main>;
}
