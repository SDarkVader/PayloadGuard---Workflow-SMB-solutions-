import EnquiryForm from "@/components/EnquiryForm";
import { activeClient } from "@/config/client";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <h1>Automated Roofing Enquiry</h1>
        <p>Aberdeen — tell us what&apos;s happened and we&apos;ll get back to you.</p>
        <span className="hero-badge">
          ⏱ {activeClient.callbackWindowMinutes}-minute callback, with text updates
        </span>
      </header>
      <EnquiryForm />
    </main>
  );
}
