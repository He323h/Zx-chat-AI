import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setLocation("/settings")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground text-base">Privacy Policy</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5 text-sm text-foreground leading-relaxed">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Last updated: July 2026</p>
            <p className="text-muted-foreground text-xs">
              This Privacy Policy describes how EngliFly / AI English Tutor / ZX-Chat AI ("we", "our", or "the app") collects, uses, and protects your information when you use our application.
            </p>
          </div>

          <Section title="1. Information We Collect">
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Email address</strong> — collected at registration and used to identify your account.</li>
              <li><strong className="text-foreground">Usage statistics</strong> — daily practice minutes, session counts, streak data, and your selected English level, used to personalise your experience.</li>
              <li><strong className="text-foreground">Chat messages</strong> — messages you send during AI tutor sessions are temporarily processed to generate AI responses. They are <em>not</em> permanently stored on our servers.</li>
              <li><strong className="text-foreground">Device information</strong> — basic technical data (browser type, OS) collected automatically for app functionality.</li>
            </ul>
          </Section>

          <Section title="2. App Features and Services">
            <p className="text-muted-foreground mb-2">EngliFly / AI English Tutor offers the following services:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">AI Teacher for English Conversation Practice</strong> — Practice speaking English with our AI tutor in real-time conversations in Hindi and English.</li>
              <li><strong className="text-foreground">Voice Call Practice with AI</strong> — Engage in voice-based conversations to improve pronunciation and listening skills.</li>
              <li><strong className="text-foreground">Vocabulary Builder</strong> — Learn and practice new English words with interactive exercises.</li>
              <li><strong className="text-foreground">Grammar Fixes</strong> — Get instant corrections and explanations for grammar mistakes.</li>
              <li><strong className="text-foreground">Quiz and Streak Tracking</strong> — Test your knowledge with quizzes and track your daily learning streak.</li>
              <li><strong className="text-foreground">Actor Mode for Roleplay</strong> — Practice real-life scenarios with AI actors in different contexts.</li>
              <li><strong className="text-foreground">Subscription-Based Premium Features</strong> — Access unlimited daily sessions and advanced features with a premium subscription at ₹49/month.</li>
              <li><strong className="text-foreground">Free Trial</strong> — New users get a free trial period with no credit card required.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>To provide and operate the AI English tutoring service and all its features.</li>
              <li>To personalise your practice sessions based on your English level and history.</li>
              <li>To track your learning progress and maintain your streak.</li>
              <li>To enforce daily usage limits as per your subscription plan.</li>
              <li>To review reported content and maintain a safe community.</li>
              <li>We do NOT sell your data to third parties.</li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p className="text-muted-foreground">
              Your account data (email, level, streak, usage stats) is retained for as long as your account is active. Chat messages exchanged during AI tutor sessions are <strong className="text-foreground">not permanently stored</strong>. Messages in chat sessions are automatically deleted when the session ends.
            </p>
          </Section>

          <Section title="5. Third-Party Services">
            <p className="text-muted-foreground mb-2">We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Firebase (Google)</strong> — for user authentication and database storage. Governed by Google's Privacy Policy.</li>
              <li><strong className="text-foreground">Google Gemini AI / Groq AI</strong> — your chat messages are sent to AI providers to generate responses.</li>
              <li><strong className="text-foreground">Razorpay</strong> — for processing subscription payments. Governed by Razorpay's Privacy Policy.</li>
            </ul>
          </Section>

          <Section title="6. Data Security">
            <p className="text-muted-foreground">
              We implement reasonable technical safeguards to protect your data. We use Firebase Authentication and industry-standard encryption. However, no method of transmission over the Internet is 100% secure.
            </p>
          </Section>

          <Section title="7. Children's Privacy">
            <p className="text-muted-foreground">
              EngliFly / AI English Tutor is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal data, please contact us immediately.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p className="text-muted-foreground">
              You may request deletion of your account and associated data at any time by contacting us. You can also update your profile information within the app settings.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p className="text-muted-foreground mb-2">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Developer:</strong> Hemant Kulhada</p>
              <p><strong className="text-foreground">Email:</strong> kulhadahemant20@gmail.com</p>
              <p><strong className="text-foreground">Phone:</strong> 7746803880</p>
              <p className="pt-1"><strong className="text-foreground">Grievance Officer:</strong> Hemant Kulhada</p>
              <p><strong className="text-foreground">Email:</strong> kulhadahemant20@gmail.com</p>
              <p className="pt-1"><strong className="text-foreground">Address:</strong> Bhopal, Madhya Pradesh, India</p>
              <p className="mt-2">
                For any privacy-related concerns or grievances, you can contact the Grievance Officer at kulhadahemant20@gmail.com. We will respond within 30 days.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-foreground mb-1.5">{title}</p>
      {children}
    </div>
  );
}
