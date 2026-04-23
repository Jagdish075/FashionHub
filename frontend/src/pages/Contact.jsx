import React from "react";
import useSiteSettings from "../hooks/useSiteSettings";

const Contact = () => {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
      <p className="text-gray-600 mb-6">Have questions about sizing, orders or returns? We'd love to help.</p>

      <form className="max-w-xl bg-white p-6 rounded shadow space-y-4">
        <input className="w-full border px-3 py-2 rounded" placeholder="Your name" />
        <input className="w-full border px-3 py-2 rounded" placeholder="Email address" />
        <textarea className="w-full border px-3 py-2 rounded" rows="4" placeholder="How can we help?"></textarea>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Send Message</button>
      </form>

      <div className="max-w-xl mt-8 bg-gray-50 border border-gray-200 p-5 rounded">
        <h2 className="font-semibold text-gray-800 mb-2">Support Details</h2>
        <p className="text-sm text-gray-700">Email: {settings.contactEmail}</p>
        <p className="text-sm text-gray-700">Phone: {settings.contactPhone}</p>
        <p className="text-sm text-gray-700">Address: {settings.contactAddress}</p>
      </div>
    </div>
  );
};

export default Contact;
