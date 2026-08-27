import EnquiryForm from "@/components/EnquiryForm";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <h1>Automated Roofing Enquiry</h1>
        <p>Aberdeen — tell us what&apos;s happened and we&apos;ll get back to you.</p>
        <span className="hero-badge">⏱ 45-minute callback, with text updates</span>
      </header>
      <EnquiryForm />
    </main>
  );
}
