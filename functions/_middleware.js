export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const params = url.searchParams;

  if (url.pathname.startsWith('/s/')) {
    const text = params.get('bt') || params.get('bbt') || '';
    const color = (params.get('color') || params.get('bcolor') || '3b82f6').replace('#', '');
    const shape = params.get('shape') || 'squircle';
    const isDeepFried = params.get('bdf') === 'true';
    const zoom = params.get('bz') || '100';
    
    let radius = '150';
    if (shape === 'circle') radius = 'max';
    if (shape === 'square') radius = '0';
    if (shape === 'roundrect') radius = '80';

    let imgParam = params.get('img') || '';
    let baseImageId = 'one_pixel.png';
    let version = '';
    let iconTransform = `e_colorize:100,co_rgb:${color}`;

    if (imgParam.startsWith('cld:')) {
        let fullId = imgParam.replace('cld:', '').replace(/ /g, '%20').replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
        const versionMatch = fullId.match(/^(v\d+)\/(.+)$/);
        if (versionMatch) {
            version = versionMatch[1];
            baseImageId = versionMatch[2];
        } else {
            baseImageId = fullId;
        }
        iconTransform = `c_fill,g_center,z_${zoom}`;
        if (isDeepFried) iconTransform += ',e_saturation:100,e_contrast:100,e_sharpen:1000';
    }

    // Auto-wrap icon text if it has multiple words (match app behavior)
    let processedText = text.toUpperCase().replace(/[#&?%]/g, '');
    if (processedText.includes(' ') && processedText.length > 7) {
        const words = processedText.split(' ');
        const mid = Math.floor(words.length / 2);
        processedText = words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
    }
    const cleanText = encodeURIComponent(processedText);
    
    // FANCY PRODUCT SHOT (Final professional layout with auto-wrapping)
    const imageUrl = [
        `https://res.cloudinary.com/${imgParam ? 'rm20abcd26' : 'demo'}/image/upload`,
        `c_fill,w_1200,h_630,co_rgb:0f172a,e_colorize:100`, // Step 1: Create canvas
        `l_${baseImageId.replace(/\//g, ':')}/c_fill,w_450,h_450,r_${radius},${iconTransform}/fl_layer_apply,g_center,x_-300`, // Step 2: Pin icon
        cleanText ? `l_text:Arial_80_bold_line_spacing_-20:${cleanText},co_rgb:ffffff/fl_layer_apply,g_center,x_-300,w_400,c_fit` : '', // Step 3: Pin icon text (centered + wrapped)
        `l_text:Montserrat_95_bold_letter_spacing_-2:Icon%20Studio,co_rgb:818cf8/fl_layer_apply,g_west,x_620,y_-120`, // Step 4: Brand title
        `l_text:Montserrat_55_bold:View%20shared%0Aicon%20design,co_rgb:ffffff/fl_layer_apply,g_west,x_620,y_80,w_500,c_fit`, // Step 5: Subtitle
        imgParam ? `${version ? version + '/' : ''}${baseImageId}.jpg` : baseImageId
    ].filter(Boolean).join('/');

    const title = text ? `"${text}" | Icon Studio` : "Shared Design | Icon Studio";
    const desc = "Check out this custom icon design I made in Icon Studio! Edit, customize, and share your own high-fidelity icons instantly.";
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <link rel="canonical" href="https://iconstudio.ryanmarch.me/">
    <meta name="robots" content="noindex, follow">
    <meta property="og:site_name" content="Icon Studio">
    <meta property="og:url" content="${request.url}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:type" content="website">
    <meta name="theme-color" content="#${color}">
</head>
<body>
    <script data-cfasync="false">
        (function() {
            window.location.replace('/app/' + window.location.search);
        })();
    </script>
</body>
</html>`;

    return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
  }

  return next();
}
