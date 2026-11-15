import type { ListingImage, PropertyListing } from '../types';

/**
 * Photos for the seeded property, land and vehicle listings. The first entry in each
 * array is the cover used on cards; the rest fill the gallery in the detail modal.
 *
 * These are openly licensed photos served from the Wikimedia Commons CDN. They are
 * representative of the area or vehicle class, not photos of the exact item on offer,
 * so the UI labels them as such and shows the photographer credit. Every source and
 * licence is also listed on the Photography credits page.
 *
 * To move photos to your own storage bucket, either set VITE_LISTING_IMAGE_CDN_BASE and
 * store relative keys (e.g. "listings/ab-001.jpg") here, write absolute bucket URLs into
 * each listing's own images array (that always wins over this map), or upload real
 * photos through the admin upload endpoint, which stores them on the listing.
 */
export const LISTING_IMAGES: Record<string, ListingImage[]> = {
  "ab-001": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Aberdeen%2C_Freetown%2C_Sierra_Leone_-_panoramio.jpg/960px-Aberdeen%2C_Freetown%2C_Sierra_Leone_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen,_Freetown,_Sierra_Leone_-_panoramio.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Aberdeen_Bay_-_Freetown_2012_-_panoramio.jpg/960px-Aberdeen_Bay_-_Freetown_2012_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen_Bay_-_Freetown_2012_-_panoramio.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Aberdeen_Houses_-_Freetown_July_2012_-_panoramio.jpg/960px-Aberdeen_Houses_-_Freetown_July_2012_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen_Houses_-_Freetown_July_2012_-_panoramio.jpg",
    },
  ],
  "ab-002": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Lumley_Beach_Freetown.JPG/960px-Lumley_Beach_Freetown.JPG",
      credit: "Hussein Kefel",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Lumley_Beach_Freetown.JPG",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Beach_in_Freetown%2C_Sierra_Leone_%2814176784751%29.jpg/960px-Beach_in_Freetown%2C_Sierra_Leone_%2814176784751%29.jpg",
      credit: "Erik Cleves Kristensen",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Beach_in_Freetown,_Sierra_Leone_%2814176784751%29.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Aberdeen_beach_road.jpg/960px-Aberdeen_beach_road.jpg",
      credit: "Victor turay",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen_beach_road.jpg",
    },
  ],
  "ab-003": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Hill_Station_Freetown_Colonial_Building_02.jpg/960px-Hill_Station_Freetown_Colonial_Building_02.jpg",
      credit: "Chtrede",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hill_Station_Freetown_Colonial_Building_02.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Hill_Station_Freetown_Colonial_Building_01.jpg/960px-Hill_Station_Freetown_Colonial_Building_01.jpg",
      credit: "Chtrede",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hill_Station_Freetown_Colonial_Building_01.jpg",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/9/90/State_House%2C_Freetown%2C_Sierra_Leone.jpg",
      credit: "Bahsoon Bros.",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:State_House,_Freetown,_Sierra_Leone.jpg",
    },
  ],
  "ab-004": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Sierra_leone_mounts_%2C_on_the_road_to_Bo_._Oct_2010_-_panoramio.jpg/960px-Sierra_leone_mounts_%2C_on_the_road_to_Bo_._Oct_2010_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sierra_leone_mounts_,_on_the_road_to_Bo_._Oct_2010_-_panoramio.jpg",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Sierra_Leone%2C_Guinea_international_road.jpg",
      credit: "Kazoo93",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sierra_Leone,_Guinea_international_road.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/VW_bus_near_farm_shelter_along_road_in_northern_Sierra_Leone_%28West_Africa%29_%28851713453%29.jpg/960px-VW_bus_near_farm_shelter_along_road_in_northern_Sierra_Leone_%28West_Africa%29_%28851713453%29.jpg",
      credit: "John Atherton",
      license: "CC BY-SA 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:VW_bus_near_farm_shelter_along_road_in_northern_Sierra_Leone_%28West_Africa%29_%28851713453%29.jpg",
    },
  ],
  "es-001": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Aberdeen_Houses_-_Freetown_July_2012_-_panoramio.jpg/960px-Aberdeen_Houses_-_Freetown_July_2012_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen_Houses_-_Freetown_July_2012_-_panoramio.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Aberdeen_Bay_-_Freetown_%2C_July_2012_-_panoramio.jpg/960px-Aberdeen_Bay_-_Freetown_%2C_July_2012_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen_Bay_-_Freetown_,_July_2012_-_panoramio.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Aberdeen%2C_Freetown%2C_Sierra_Leone_-_panoramio.jpg/960px-Aberdeen%2C_Freetown%2C_Sierra_Leone_-_panoramio.jpg",
      credit: "Ghassan Mroue",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Aberdeen,_Freetown,_Sierra_Leone_-_panoramio.jpg",
    },
  ],
  "es-002": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Dwzark_view_of_freetown.jpg/960px-The_Dwzark_view_of_freetown.jpg",
      credit: "001Rock",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Dwzark_view_of_freetown.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Freetown_street_%2813992704238%29.jpg/960px-Freetown_street_%2813992704238%29.jpg",
      credit: "Erik Cleves Kristensen",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Freetown_street_%2813992704238%29.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Beach_in_Freetown%2C_Sierra_Leone_%2814176784751%29.jpg/960px-Beach_in_Freetown%2C_Sierra_Leone_%2814176784751%29.jpg",
      credit: "Erik Cleves Kristensen",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Beach_in_Freetown,_Sierra_Leone_%2814176784751%29.jpg",
    },
  ],
  "es-003": [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Makeni_Wusum.JPG",
      credit: "David Stanley",
      license: "Public domain",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Makeni_Wusum.JPG",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/Sunset_over_Makeni%2C_Sierra_Leone_%28Unsplash%29.jpg/960px-Sunset_over_Makeni%2C_Sierra_Leone_%28Unsplash%29.jpg",
      credit: "Red Morley Hewitt redvers",
      license: "CC0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sunset_over_Makeni,_Sierra_Leone_%28Unsplash%29.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Makeni%2C_Sierra_Leone_-_Mapillary_%28PTorXQnlRBZ7KlI3olHDAw%29.jpg/960px-Makeni%2C_Sierra_Leone_-_Mapillary_%28PTorXQnlRBZ7KlI3olHDAw%29.jpg",
      credit: "danbjoseph @ Mapillary.com",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Makeni,_Sierra_Leone_-_Mapillary_%28PTorXQnlRBZ7KlI3olHDAw%29.jpg",
    },
  ],
  "es-004": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Street_in_Kenema_01.jpg/960px-Street_in_Kenema_01.jpg",
      credit: "Patrick S. Bangura",
      license: "Copyrighted free use",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Street_in_Kenema_01.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Street_in_Kenema_02.jpg/960px-Street_in_Kenema_02.jpg",
      credit: "Patrick S. Bangura",
      license: "Copyrighted free use",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Street_in_Kenema_02.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Street_in_Kenema_03.jpg/960px-Street_in_Kenema_03.jpg",
      credit: "Patrick S. Bangura",
      license: "Copyrighted free use",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Street_in_Kenema_03.jpg",
    },
  ],
  "ld-001": [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Sierra_Leone_Road.jpg",
      credit: "LindsayStark",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sierra_Leone_Road.jpg",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Sierra_Leone_Kailahun_road.jpg",
      credit: "Wikimedia contributor",
      license: "Public domain",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sierra_Leone_Kailahun_road.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/VW_bus_near_farm_shelter_along_road_in_northern_Sierra_Leone_%28West_Africa%29_%28851713453%29.jpg/960px-VW_bus_near_farm_shelter_along_road_in_northern_Sierra_Leone_%28West_Africa%29_%28851713453%29.jpg",
      credit: "John Atherton",
      license: "CC BY-SA 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:VW_bus_near_farm_shelter_along_road_in_northern_Sierra_Leone_%28West_Africa%29_%28851713453%29.jpg",
    },
  ],
  "ld-002": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/The_village_of_Kakoya_%28Koya%29%2C_Sierra_Leone_%28West_Africa%29_%282118689384%29.jpg/960px-The_village_of_Kakoya_%28Koya%29%2C_Sierra_Leone_%28West_Africa%29_%282118689384%29.jpg",
      credit: "John Atherton",
      license: "CC BY-SA 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:The_village_of_Kakoya_(Koya),_Sierra_Leone_(West_Africa)_(2118689384).jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Village_in_northern_Sierra_Leone_%28West_Africa%29_%28851481247%29.jpg/960px-Village_in_northern_Sierra_Leone_%28West_Africa%29_%28851481247%29.jpg",
      credit: "John Atherton",
      license: "CC BY-SA 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Village_in_northern_Sierra_Leone_%28West_Africa%29_%28851481247%29.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Children_at_a_farm_shelter_near_Kakoya%2C_Sierra_Leone_%28West_Africa%29_%282098442312%29.jpg/960px-Children_at_a_farm_shelter_near_Kakoya%2C_Sierra_Leone_%28West_Africa%29_%282098442312%29.jpg",
      credit: "John Atherton",
      license: "CC BY-SA 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Children_at_a_farm_shelter_near_Kakoya,_Sierra_Leone_%28West_Africa%29_%282098442312%29.jpg",
    },
  ],
  "ld-003": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Flickr_-_stringer_bel_-_River_No._2_Village_Beach%2C_Sierra_Leone_%281%29.jpg/960px-Flickr_-_stringer_bel_-_River_No._2_Village_Beach%2C_Sierra_Leone_%281%29.jpg",
      credit: "Annabel Symington",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Flickr_-_stringer_bel_-_River_No._2_Village_Beach,_Sierra_Leone_(1).jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Sierra_Leone_village_woman.jpg/960px-Sierra_Leone_village_woman.jpg",
      credit: "LindsayStark",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sierra_Leone_village_woman.jpg",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/9/9d/A_farmer_working_on_his_farm_Gloucester_village_Sierra_Leone.jpg",
      credit: "ODC-SIERRA-LEONE",
      license: "CC0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A_farmer_working_on_his_farm_Gloucester_village_Sierra_Leone.jpg",
    },
  ],
  "ld-004": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/A_Massive_Cassava_Farm.jpg/960px-A_Massive_Cassava_Farm.jpg",
      credit: "Cpraise",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Massive_Cassava_Farm.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/A_Catholic_experimental_farm_in_Sierra_Leone.jpg/960px-A_Catholic_experimental_farm_in_Sierra_Leone.jpg",
      credit: "Gabriel Rockwell",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Catholic_experimental_farm_in_Sierra_Leone.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/SierraLeoneHofstra4.12.jpg/960px-SierraLeoneHofstra4.12.jpg",
      credit: "Sjoerd Hofstra",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:SierraLeoneHofstra4.12.jpg",
    },
  ],
  "ve-001": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Kenya_auto_rickshaw_tuk_tuk_2006.jpg/960px-Kenya_auto_rickshaw_tuk_tuk_2006.jpg",
      credit: "Matt Rudge",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Kenya_auto_rickshaw_tuk_tuk_2006.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Auto_rickshaw_in_Ahmedabad.jpg/960px-Auto_rickshaw_in_Ahmedabad.jpg",
      credit: "Bernard Gagnon",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Auto_rickshaw_in_Ahmedabad.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Tuk-tuk_taxi_sidecar_in_Laos.jpg/960px-Tuk-tuk_taxi_sidecar_in_Laos.jpg",
      credit: "Basile Morin",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Tuk-tuk_taxi_sidecar_in_Laos.jpg",
    },
  ],
  "ve-002": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/A_Moto_%28motorcycle_taxi%29_in_Kigali.jpg/960px-A_Moto_%28motorcycle_taxi%29_in_Kigali.jpg",
      credit: "Jenny Paul",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Moto_(motorcycle_taxi)_in_Kigali.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Motorcycle_taxi.jpg/960px-Motorcycle_taxi.jpg",
      credit: "Biva2017",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Motorcycle_taxi.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/A_Moto_%28motorcycle_taxi%29_in_a_street_in_Kigali.jpg/960px-A_Moto_%28motorcycle_taxi%29_in_a_street_in_Kigali.jpg",
      credit: "Jenny Paul",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Moto_%28motorcycle_taxi%29_in_a_street_in_Kigali.jpg",
    },
  ],
  "ve-003": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/2014_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282014-04-11%29.jpg/960px-2014_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282014-04-11%29.jpg",
      credit: "OSX",
      license: "Public domain",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2014_Toyota_Corolla_(ZRE172R)_Ascent_sedan_(2014-04-11).jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/2018_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282018-11-02%29_02.jpg/960px-2018_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282018-11-02%29_02.jpg",
      credit: "EurovisionNim",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2018_Toyota_Corolla_%28ZRE172R%29_Ascent_sedan_%282018-11-02%29_02.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Toyota_Corolla_%28E180%29_sedan_facelift_1X7A0306.jpg/960px-Toyota_Corolla_%28E180%29_sedan_facelift_1X7A0306.jpg",
      credit: "Alexander Migl",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Toyota_Corolla_%28E180%29_sedan_facelift_1X7A0306.jpg",
    },
  ],
  "ve-004": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/2017_Toyota_HiAce_%28TRH201R%29_LWB_van_%282018-10-01%29_01.jpg/960px-2017_Toyota_HiAce_%28TRH201R%29_LWB_van_%282018-10-01%29_01.jpg",
      credit: "EurovisionNim",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2017_Toyota_HiAce_(TRH201R)_LWB_van_(2018-10-01)_01.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/2016_Toyota_HiAce_%28KDH223R%29_Commuter_Super_LWB_van%2C_Black_%26_White_13_MAXI_%282018-11-22%29_01.jpg/960px-2016_Toyota_HiAce_%28KDH223R%29_Commuter_Super_LWB_van%2C_Black_%26_White_13_MAXI_%282018-11-22%29_01.jpg",
      credit: "EurovisionNim",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2016_Toyota_HiAce_%28KDH223R%29_Commuter_Super_LWB_van,_Black_&_White_13_MAXI_%282018-11-22%29_01.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/2003_Toyota_HiAce_Commuter_Van.jpg/960px-2003_Toyota_HiAce_Commuter_Van.jpg",
      credit: "Coolalabright",
      license: "CC BY 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2003_Toyota_HiAce_Commuter_Van.jpg",
    },
  ],
  "ve-005": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Toyota_Hilux_4x2_2.4_J_security_truck_20221015.jpg/960px-Toyota_Hilux_4x2_2.4_J_security_truck_20221015.jpg",
      credit: "Ethan Llamas",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Toyota_Hilux_4x2_2.4_J_security_truck_20221015.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/2020_Toyota_Hilux_E_%28front_left_side_view%29.jpg/960px-2020_Toyota_Hilux_E_%28front_left_side_view%29.jpg",
      credit: "Ethan Llamas",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2020_Toyota_Hilux_E_%28front_left_side_view%29.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Toyota_HiLux_GR_Sport_1X7A7281.jpg/960px-Toyota_HiLux_GR_Sport_1X7A7281.jpg",
      credit: "Alexander-93",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Toyota_HiLux_GR_Sport_1X7A7281.jpg",
    },
  ],
  "ve-006": [
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/2013_Mitsubishi_Fuso_Fighter_Truck_manual_StarTrack.jpg/960px-2013_Mitsubishi_Fuso_Fighter_Truck_manual_StarTrack.jpg",
      credit: "EurovisionNim",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:2013_Mitsubishi_Fuso_Fighter_Truck_manual_StarTrack.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Mitsubishi_Fuso_The_Great_FV-R_semi-truck_%28Philippines%29.jpg/960px-Mitsubishi_Fuso_The_Great_FV-R_semi-truck_%28Philippines%29.jpg",
      credit: "Commercial spotter63",
      license: "CC0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Mitsubishi_Fuso_The_Great_FV-R_semi-truck_%28Philippines%29.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Mitsubishi_Fuso_DUONIC.jpg/960px-Mitsubishi_Fuso_DUONIC.jpg",
      credit: "TTTNIS",
      license: "Public domain",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Mitsubishi_Fuso_DUONIC.jpg",
    },
  ],
  "ve-007": [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Four-axle_flatbed_container_semi-trailer.jpg",
      credit: "Summit666",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Four-axle_flatbed_container_semi-trailer.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Flatbed_semi-trailer_truck%2C_Russia.jpg/960px-Flatbed_semi-trailer_truck%2C_Russia.jpg",
      credit: "Georg Pik",
      license: "CC0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Flatbed_semi-trailer_truck,_Russia.jpg",
    },
    {
      url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Truck_with_trailer_in_Toronto.jpg/960px-Truck_with_trailer_in_Toronto.jpg",
      credit: "Taxiarchos228",
      license: "FAL",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Truck_with_trailer_in_Toronto.jpg",
    },
  ],
};

/**
 * Optional CDN / storage bucket prefix. Relative image keys are joined onto it, so the
 * repo can host photos on Supabase Storage (or any CDN) without touching the data.
 */
const imageCdnBase = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.VITE_LISTING_IMAGE_CDN_BASE ?? '')
  .trim()
  .replace(/\/+$/, '');

export const resolveListingImageUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url) || !imageCdnBase) return url;
  return `${imageCdnBase}/${url.replace(/^\/+/, '')}`;
};

export const getListingImages = (listing: PropertyListing): ListingImage[] =>
  listing.images?.length ? listing.images : (LISTING_IMAGES[listing.id] ?? []);
