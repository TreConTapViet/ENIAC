declare module '@emailjs/browser' {
  const emailjs: {
    init: (options: string | { publicKey: string }) => void;
    send: (
      serviceId: string,
      templateId: string,
      templateParams?: Record<string, unknown>,
      options?: string | { publicKey: string }
    ) => Promise<{ status: number; text: string }>;
  };
  export default emailjs;
}
