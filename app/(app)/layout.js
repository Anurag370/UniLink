import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <>
      <Sidebar />
      <div className="lg:ml-[240px]">{children}</div>
    </>
  );
}
