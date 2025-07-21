const utils = {
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
};

const geo = {
    // TWD97 UTM to WGS84 Latitude and Longitude
        /**
         * CONVERTING UTM TO LATITUDE AND LONGITUDE (OR VICE VERSA)
         * https://fypandroid.wordpress.com/2011/09/03/converting-utm-to-latitude-and-longitude-or-vice-versa/
         *
         * 測繪資訊成果供應管理系統(原內政部地政司衛星測量中心)
         * https://gps.moi.gov.tw/sscenter/introduce/IntroducePage.aspx?Page=GPS9
         */
    TWD97toWGS84(coord97) {
        // Symbols
        let easting = coord97.x;
        let relativeX = easting - 250000; // x (relative to the central meridian)
        let northing = coord97.y;
        let long0 = utils.toRadians(121); // central meridian of zone
        let k0 = 0.9999; // scale along long_0
        let Equatorial_Radius = 6378137; // in meters
        let Flattening = 1 / 298.257222101;
        let e_abf = Math.sqrt(Flattening * (2 - Flattening));
        let e_2 = e_abf * e_abf;
        let e_4 = e_abf * e_abf * e_abf * e_abf;
        let e_6 = e_abf * e_abf * e_abf * e_abf * e_abf * e_abf;
        // Calculate the Meridional Arc
        let Meridional_Arc = northing / k0;
        // Calculate Footprint Latitude
        let mu = Meridional_Arc / Equatorial_Radius / (1 - e_2 / 4 - 3 * e_4 / 64 - 5 * e_6 / 256);
        let e1 = Flattening / (2 - Flattening);
        let e1_2 = e1 * e1;
        let e1_3 = e1 * e1 * e1;
        let e1_4 = e1 * e1 * e1 * e1;
        let J1 = (1.5 * e1 - 27 / 32 * e1_3);
        let J2 = (21 / 16 * e1_2 - 55 / 32 * e1_4);
        let J3 = (151 / 96 *e1_3);
        let J4 = (1097 / 512 *e1_4);
        let fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);
        // Calculate Latitude and Longitude
        let ee2 = e_2 / (1 - e_2);
        let C1 = ee2 * Math.cos(fp) * ee2 * Math.cos(fp);
        let C1_2 = C1 * C1;
        let T1 = Math.tan(fp) * Math.tan(fp)
        let T1_2 = T1 * T1;
        let ess = Math.sqrt(1 - e_2 * Math.sin(fp) * Math.sin(fp));
        let R1 = Equatorial_Radius * (1 - e_2) / ess / ess / ess;
        let N1 = Equatorial_Radius / ess
        let D = relativeX / N1 / k0;
        let D_3 = D * D * D;
        let D_4 = D * D * D * D;
        let D_5 = D * D * D * D * D;
        let D_6 = D * D * D * D * D * D;
        let Q1 = N1 * Math.tan(fp) / R1;
        let Q2 = D * D / 2;
        let Q3 = (5 + 3 * T1 + 10 * C1 - 4 * C1_2 - 9 * ee2) * D_4 / 24;
        let Q4 = (61 + 90 * T1 + 298 * C1 + 45 * T1_2 - 3 * C1_2 - 252 * ee2) * D_6 / 720;
        let Q6 = (1 + 2 * T1 + C1) * D_3 / 6;
        let Q7 = (5 - 2 * C1 + 28 * T1 - 3 * C1_2 + 8 * ee2 + 24 * T1_2) * D_5 / 120;
        let latR = fp - Q1 * (Q2 - Q3 + Q4);
        let lonR = long0 + (D - Q6 + Q7) / Math.cos(fp);
        
        return { lat: utils.toDegrees(latR), lon: utils.toDegrees(lonR) };
    }
};