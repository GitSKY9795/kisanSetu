import "../styles/dashboard.css";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { useMarketDashboard } from "../hooks/useMarketDashboard.js";
import { useWeather } from "../hooks/useWeather.js";
import HeroBanner from "../components/dashboard/HeroBanner.jsx";
import FeatureCards from "../components/dashboard/FeatureCards.jsx";
import MarketOverview from "../components/dashboard/MarketOverview.jsx";
import PriceTrendChart from "../components/dashboard/PriceTrendChart.jsx";
import MandiPrices from "../components/dashboard/MandiPrices.jsx";
import { AiPromoCard, OpportunityCard, QuickActions } from "../components/dashboard/SideCards.jsx";
import ServicesStrip from "../components/dashboard/ServicesStrip.jsx";

export default function FarmerOverview() {
  const { t } = useLanguage();
  const { profile, account } = useAuth();
  const geo = useGeolocation();

  // The farmer's registered location wins; live geolocation fills in when there isn't one.
  const district = profile?.district || geo.district || null;
  const state = profile?.state || geo.state || null;
  const usingDetectedLocation = !profile?.district && Boolean(geo.district);
  const location = [district, state].filter(Boolean).join(", ");

  const weather = useWeather({
    lat: usingDetectedLocation ? geo.lat : null,
    lon: usingDetectedLocation ? geo.lon : null,
    district,
  });

  const market = useMarketDashboard({
    district,
    state,
    mainCrops: profile?.main_crops,
    // Wait for a location to be known (or for geolocation to give up) so prices are
    // fetched once for the right place instead of once for no place and again for the real one.
    ready: Boolean(district) || !geo.loading,
  });

  const firstName = (profile?.name || account?.full_name || account?.username || t("Farmer")).split(" ")[0];

  return (
    <div className="db">
      <HeroBanner name={firstName} location={location} weather={weather} />
      <FeatureCards />

      <div className="db-grid">
        <div className="db-col">
          <MarketOverview selected={market.selected} detail={market.detail} weather={weather.data} loading={market.rowsLoading} />
          <PriceTrendChart selected={market.selected} detail={market.detail} />
        </div>
        <div className="db-col">
          <MandiPrices
            rows={market.rows}
            loading={market.rowsLoading}
            selectedKey={market.selected?.key}
            onSelect={market.selectCrop}
          />
          <OpportunityCard selected={market.selected} />
        </div>
        <div className="db-col">
          <AiPromoCard />
          <QuickActions />
        </div>
      </div>

      <ServicesStrip />
    </div>
  );
}

