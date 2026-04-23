import { useEffect, useState } from "react";
import API from "../utils/api";
import { defaultSiteSettings } from "../utils/siteSettings";

const useSiteSettings = () => {
  const [settings, setSettings] = useState(defaultSiteSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const { data } = await API.get("/api/settings");
        if (isMounted && data) {
          setSettings({ ...defaultSiteSettings, ...data, currency: "INR" });
        }
      } catch {
        if (isMounted) {
          setSettings(defaultSiteSettings);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, loading };
};

export default useSiteSettings;
