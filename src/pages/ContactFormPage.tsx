import { UserDataForm } from "@/components/forms/UserDataForm";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ContactFormPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
            <p className="text-muted-foreground">
              Fill out the form below and we'll get back to you soon.
            </p>
          </div>
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <UserDataForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
