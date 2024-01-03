import * as cheerio from "cheerio";
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { createObjectCsvWriter } from 'csv-writer';

init();

async function searchGoogleMaps() {
  try {
    const start = Date.now();

    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: false,
      executablePath: "", // your path here
    });

    const page = await browser.newPage();

    const query = "kfc di jakarta";

    try {
      await page.goto(
        `https://www.google.com/maps/search/${query.split(" ").join("+")}`
      );
    } catch (error) {
      console.log("error going to page");
    }

    async function autoScroll(page) {
      await page.evaluate(async () => {
        const wrapper = document.querySelector('div[role="feed"]');
    
        await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 1000;
          var scrollDelay = 3000;
    
          var timer = setInterval(async () => {
            var scrollHeightBefore = wrapper.scrollHeight;
            wrapper.scrollBy(0, distance);
            totalHeight += distance;
    
            if (totalHeight >= scrollHeightBefore) {
              totalHeight = 0;
              await new Promise((resolve) => setTimeout(resolve, scrollDelay));
    
              // Calculate scrollHeight after waiting
              var scrollHeightAfter = wrapper.scrollHeight;
    
              if (scrollHeightAfter > scrollHeightBefore) {
                // More content loaded, keep scrolling
                return;
              } else {
                // No more content loaded, stop scrolling
                clearInterval(timer);
                resolve();
              }
            }
          }, 700);
        });
      });
    }
    

    await autoScroll(page);

    const html = await page.content();
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));

    await browser.close();
    console.log("browser closed");

    // get all a tag parent where a tag href includes /maps/place/
    const $ = cheerio.load(html);
    const aTags = $("a");
    const parents = [];
    aTags.each((i, el) => {
      const href = $(el).attr("href");
      if (!href) {
        return;
      }
      if (href.includes("/maps/place/")) {
        parents.push($(el).parent());
      }
    });

    console.log("parents", parents.length);

    // Fungsi untuk mengekstrak koordinat dari URL
    // ...

    function extractCoordinatesFromUrl(url) {
      console.log('URL', url);
      try {
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match && match.length === 3) {
          const latitude = parseFloat(match[1]);
          const longitude = parseFloat(match[2]);
    
          if (!isNaN(latitude) && !isNaN(longitude)) {
            console.log('Coordinates:', { latitude, longitude });
            return { latitude, longitude };
          }
        } else {
          // Attempt to handle alternative URL structure with placeId
          const matchAlternative = url.match(/\/place\/[^\/]+\/data=!4m7!3m6!1s([^!]+)!8m2!3d([^!]+)!4d([^!]+)!16s/);
          if (matchAlternative && matchAlternative.length === 4) {
            const placeId = matchAlternative[1];
            const latitude = parseFloat(matchAlternative[2]);
            const longitude = parseFloat(matchAlternative[3]);
    
            if (!isNaN(latitude) && !isNaN(longitude)) {
              console.log('Coordinates (Alternative):', { latitude, longitude });
              return { latitude, longitude };
            }
          }
        }
    
        console.error('Invalid URL structure or coordinates not found:', url);
        return null;
      } catch (error) {
        console.error('Error extracting coordinates:', error.message);
        return null;
      }
    }
    
    
    

    
    const buisnesses = [];
    let index = 0;

    parents.forEach((parent) => {
      const urlElement = parent.find("a");
      const url = urlElement && urlElement.attr("href") ? urlElement.attr("href") : null;
      console.log('URL form parents', url)
      // get a tag where data-value="Website"
      const coordinates = extractCoordinatesFromUrl(url);
      // get a coordinates data
      const websiteElement = parent.find('a[data-value="Website"]');
      const website = websiteElement && websiteElement.attr("href") ? websiteElement.attr("href") : null;

      // find a div that includes the class fontHeadlineSmall
      const storeName = parent.find("div.fontHeadlineSmall").text().trim();
      // find span that includes class fontBodyMedium
      const ratingTextElement = parent.find("span.fontBodyMedium > span");
      const ratingText = ratingTextElement && ratingTextElement.attr("aria-label") ? ratingTextElement.attr("aria-label").replace("Bintang", "").trim() : null;

    
      // get the first div that includes the class fontBodyMedium
      const bodyDiv = parent.find("div.fontBodyMedium").first();
      const children = bodyDiv.children();
      const lastChild = children.last();
      const firstOfLast = lastChild.children().first();
      const lastOfLast = lastChild.children().last();
      index = index + 1;
    
      const coords = coordinates ? coordinates : { latitude: null, longitude: null };
    
      
      buisnesses.push({
        index,
        storeName,
        placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
        address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
        category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
        phone: lastOfLast?.text()?.split("·")?.[1]?.trim(),
        googleUrl: url,
        bizWebsite: website,
        ratingText,
        stars: ratingText?.split("Bintang")?.[0]?.trim()
          ? Number(ratingText?.split("Bintang")?.[0]?.trim())
          : null,
        numberOfReviews: ratingText
          ?.split("Bintang")?.[1]
          ?.replace("Ulasan", "")
          ?.trim()
          ? Number(
              ratingText?.split("Bintang")?.[1]?.replace("Ulasan", "")?.trim()
            )
          : null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        // Menambahkan koordinat ke dalam objek buisnesses
      });
    });


    const end = Date.now();

    console.log(`time in seconds ${Math.floor((end - start) / 1000)}`);

    return buisnesses;
  } catch (error) {
    console.log("error at googleMaps", error.message);
  }
}

async function init() {
  try {
    const places = await searchGoogleMaps();

    const csvWriter = createObjectCsvWriter({
      path: 'places.csv',
      header: [
        { id: 'index', title: 'Index'},
        { id: 'storeName', title: 'Store Name' },
        { id: 'address', title: 'Address' },
        { id: 'category', title: 'Category' },
        { id: 'phone', title: 'Phone' },
        { id: 'googleUrl', title: 'Google URL' },
        { id: 'bizWebsite', title: 'Business Website' },
        { id: 'ratingText', title: 'Rating Text' },
        { id: 'stars', title: 'Stars' },
        { id: 'numberOfReviews', title: 'Number of Reviews' },
        { id: 'latitude', title: 'Latitude' },   // Menambahkan field untuk Latitude
        { id: 'longitude', title: 'Longitude' }, // Menambahkan field untuk Longitude
      ],
    });

    // Transformasi data untuk memasukkan nilai latitude dan longitude
   // Transformasi data untuk memasukkan nilai latitude dan longitude
    // Transformasi data untuk memasukkan nilai latitude dan longitude
    const transformedPlaces = places.map(place => ({
      ...place,
      latitude: place.latitude ? place.latitude.toString().replace(',', '.') : null,
      longitude: place.longitude ? place.longitude.toString().replace(',', '.') : null,
    }));




    // Write the places data to the CSV file
    // await csvWriter.writeRecords(places);

    // Log transformedPlaces before writing to the CSV file
    console.log('Transformed Places:', transformedPlaces);

    // Write the places data to the CSV file
    await csvWriter.writeRecords(transformedPlaces);

    console.log('CSV file created successfully.');

  } catch (error) {
    console.log('Error in init:', error.message);
  }
}