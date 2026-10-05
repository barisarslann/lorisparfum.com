/* Restore the locator runtime independently of the page's rich-text editor. */
(() => {
  const loader = document.getElementById('loris-store-locator');
  const data = document.getElementById('loris-store-data');
  const page = loader?.closest('.wt-page');
  const list = page?.querySelector('.shoplist .list');
  const mapElement = page?.querySelector('#map');
  if (!data || !list || !mapElement || list.dataset.initialized) return;
  list.dataset.initialized = 'true';

  // The editor can split the controls and list into two separate containers.
  const controls = page.querySelector('.search')?.closest('.shoplist');
  const panel = list.closest('.shoplist');
  if (controls && controls !== panel) {
    const emptyContainer = controls.parentElement;
    const anchor = panel.firstChild;
    while (controls.firstChild) panel.insertBefore(controls.firstChild, anchor);
    controls.remove();
    if (!emptyContainer.children.length) emptyContainer.remove();
  }

  // Replace the remaining inline handlers so filters also clear the detail view.
  function replaceControl(selector) {
    const original = page.querySelector(selector);
    const replacement = original.cloneNode(true);
    original.replaceWith(replacement);
    return replacement;
  }
  const search = replaceControl('.search input');
  const countryControls = replaceControl('.selectcountry');
  const close = replaceControl('.shopclose');
  const single = list.querySelector('.singleitem');
  single.replaceChildren(); // A saved <br> otherwise hides every row via :not(:empty).
  close.setAttribute('role', 'button');
  close.setAttribute('tabindex', '0');
  close.setAttribute('aria-label', 'Mağaza detayını kapat');
  search.setAttribute('aria-label', 'Mağaza arayın');

  const normalize = value => value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  const stores = String(JSON.parse(data.textContent) || '').split(/\r?\n/).map(line => line.split(';').map(value => value.trim()))
    .filter(fields => fields.length >= 5 && fields[0] && fields[4])
    .map(([title, address, district, city, country, latitude, longitude]) => {
      // Some saved records put both coordinates in the same CSV field.
      if (!longitude && latitude?.split(',').length === 2) [latitude, longitude] = latitude.split(',');
      const lat = Number(latitude);
      const lng = Number(longitude);
      return {
        title, address, city, country, lat, lng,
        domestic: country === 'Türkiye',
        hasLocation: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180,
      };
    });
  let country = 'domestic';
  let cityFilter = null;
  let selected = null;
  let map;
  let infoWindow;
  const markers = [];
  const cityMarkers = [];
  const center = { lat: 39.245472, lng: 35.487361 };

  function activate(element, callback) {
    element.addEventListener('click', callback);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        callback();
      }
    });
  }

  function storeContent(store) {
    const fragment = document.createDocumentFragment();
    const title = document.createElement('strong');
    title.textContent = store.title;
    fragment.append(title, document.createTextNode(` ${store.address} ${store.city} ${store.country}`));
    return fragment;
  }

  function matches(store) {
    return (!country || store.domestic === (country === 'domestic')) &&
      (!cityFilter || store.city === cityFilter) &&
      normalize(`${store.title} ${store.address} ${store.city} ${store.country}`).includes(normalize(search.value.trim()));
  }

  function updateMarkers() {
    if (!map) return;
    const detailed = map.getZoom() >= 9 || cityFilter || selected !== null || search.value.trim();
    markers.forEach(({ marker, store, index }) => marker.setVisible(selected !== null ? selected === index : Boolean(detailed && matches(store))));
    cityMarkers.forEach(({ marker, stores: group }) => marker.setVisible(!detailed && group.some(matches)));
  }

  function filterList() {
    selected = null;
    single.replaceChildren();
    close.style.display = cityFilter ? 'block' : 'none';
    infoWindow?.close();
    stores.forEach(store => { store.row.style.display = matches(store) ? '' : 'none'; });
    [...countryControls.children].forEach((button, index) => {
      const active = country === (index === 0 ? 'domestic' : 'foreign');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateMarkers();
  }

  function showStore(store, index) {
    selected = index;
    single.replaceChildren(storeContent(store));
    const links = document.createElement('div');
    links.style.display = 'grid';
    const destination = store.hasLocation ? `${store.lat},${store.lng}` : `${store.title} ${store.address} ${store.city} ${store.country}`;
    [
      ['Yol Tarifi', `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`],
      ['WhatsApp Destek: 444 83 45', 'https://wa.me/904448345'],
      ['444 83 45', 'tel:904448345'],
      ['info@lorisparfum.com', 'mailto:info@lorisparfum.com'],
    ].forEach(([label, href]) => {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = href;
      if (href.startsWith('https:')) { link.target = '_blank'; link.rel = 'noopener'; }
      links.append(link);
    });
    single.append(links);
    close.style.display = 'block';
    panel.scrollTop = 0;
    infoWindow?.close();
    if (map && store.hasLocation) {
      map.setCenter({ lat: store.lat, lng: store.lng });
      map.setZoom(12);
      const entry = markers.find(item => item.index === index);
      if (entry) {
        const heading = document.createElement('h4');
        heading.textContent = store.title;
        infoWindow.setContent(heading);
        infoWindow.open(map, entry.marker);
      }
    }
    updateMarkers();
  }

  const rows = document.createDocumentFragment();
  stores.forEach((store, index) => {
    const row = document.createElement('div');
    row.className = `shopitem-${index}`;
    row.dataset.storeIndex = index;
    row.dataset.maincategory = store.city;
    row.dataset.location = `${store.lat},${store.lng}`;
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.append(storeContent(store));
    activate(row, () => showStore(store, index));
    store.row = row;
    rows.append(row);
  });
  list.append(rows);
  [...countryControls.children].forEach((button, index) => {
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    activate(button, () => {
      country = index === 0 ? 'domestic' : 'foreign';
      cityFilter = null;
      search.value = '';
      filterList();
      if (map) { map.setCenter(center); map.setZoom(6); }
    });
  });
  search.addEventListener('input', () => { country = null; cityFilter = null; filterList(); });
  activate(close, () => {
    cityFilter = null;
    filterList();
    if (map) { map.setCenter(center); map.setZoom(6); }
  });
  // Run after the page's old one-shot country selection as well.
  filterList();
  setTimeout(filterList, 0);

  window.lorisInitStoreLocatorMap = () => {
    if (map || !window.google?.maps) return;
    map = new google.maps.Map(mapElement, { zoom: 6, center });
    infoWindow = new google.maps.InfoWindow();
    const groups = new Map();
    stores.forEach((store, index) => {
      if (!store.hasLocation) return;
      const marker = new google.maps.Marker({ position: { lat: store.lat, lng: store.lng }, map, title: store.title, visible: false });
      marker.addListener('click', () => showStore(store, index));
      markers.push({ marker, store, index });
      // Retain the original country overview: Turkish cities, with store counts.
      if (store.domestic) {
        if (!groups.has(store.city)) groups.set(store.city, []);
        groups.get(store.city).push(store);
      }
    });
    groups.forEach((group, city) => {
      const position = {
        lat: group.reduce((sum, store) => sum + store.lat, 0) / group.length,
        lng: group.reduce((sum, store) => sum + store.lng, 0) / group.length,
      };
      const marker = new google.maps.Marker({
        position, map, title: city,
        label: { text: String(group.length), color: '#fff', fontSize: '11px', fontWeight: '600' },
        icon: { path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1, fillColor: 'crimson', strokeWeight: 1, strokeColor: '#333', scale: 8.5 },
      });
      marker.addListener('click', () => {
        country = 'domestic'; cityFilter = city; search.value = '';
        filterList(); map.setCenter(position); map.setZoom(9);
      });
      cityMarkers.push({ marker, stores: group });
    });
    map.addListener('zoom_changed', updateMarkers);
    updateMarkers();
  };
  if (window.google?.maps) {
    window.lorisInitStoreLocatorMap();
  } else {
    const script = document.createElement('script');
    script.src = `${loader.dataset.mapsUrl}&loading=async`;
    script.async = true;
    script.addEventListener('error', () => {
      mapElement.textContent = 'Harita yüklenemedi. Mağaza listesinden seçim yapıp Yol Tarifi bağlantısını kullanabilirsiniz.';
    });
    document.head.append(script);
  }
})();
