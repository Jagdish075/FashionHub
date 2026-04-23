
import React from "react";
import { Link } from "react-router-dom";
import useSiteSettings from "../hooks/useSiteSettings";

const Footer = () => {
  const { settings } = useSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-xl text-gray-800 mb-4">{settings.siteName}</h3>
            <p className="text-gray-600 text-sm">
              {settings.siteDescription}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <Link to="/" className="hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-blue-600">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Customer Service</h4>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <Link to="/track" className="hover:text-blue-600">
                  Track Order
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600">
                  Returns
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>📧 {settings.contactEmail}</li>
              <li>📞 {settings.contactPhone}</li>
              <li>📍 {settings.contactAddress}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-500 text-sm">
          © {year} {settings.siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
