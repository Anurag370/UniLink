import Sidebar from "@/components/Sidebar";

// Shell for every signed-in screen. The sidebar is rendered here (rather than
// inside each page) so it stays mounted while navigating, and the content
// offset lives in one place instead of a `lg:ml-*` class on every page.
//
// Routes inside this group keep their URLs: the "(app)" segment is a route
// group and never appears in the path.
export default function AppLayout({ children }) {
  return (
    <>
      <Sidebar />
      <div className="lg:ml-[240px]">{children}</div>
    </>
  );
}
