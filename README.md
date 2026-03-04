# 8march Site Generator

პროექტი დეველოპერებისთვის: ფორმიდან არჩევ შაბლონს, უთითებ საიტის სახელს, ტვირთავ ფოტოებს/ვიდეოს Cloudinary-ზე და იღებ ავტომატურად დაგენერირებულ გვერდს + ლინკს + QR კოდს.

## რას აკეთებს
- 3 შაბლონი: `Girlfriend`, `Wife`, `The Map of Stars`
- საიტის slug (მაგ: `nino-gift`)
- ატვირთვა: ფოტოები (მაქს 15), ვიდეო (optional) პირდაპირ Cloudinary-ზე
- გენერაცია: `public/gift/<slug>/index.html`
- მონაცემების დამახსოვრება: `public/gift/<slug>/data.json`
- შედეგი API-დან: გენერირებული URL
- UI-ზე QR კოდის გენერაცია
- ყველა დაგენერირებულ გვერდზე favicon: `📩`

## გაშვება
```bash
npm install
npm run dev
```

ბრაუზერში გახსენი: `http://localhost:3000`

## ENV (optional)
- `PORT` default: `3000`
- `BASE_URL` მაგალითად: `https://your-domain.com`

თუ `BASE_URL` არ მიუთითე, API ავტომატურად გამოიყენებს მიმდინარე host-ს.

## API
### POST `/api/generate`
`application/json`

ძირითადი ველები:
- `site_slug` (required)
- `template_choice` (`girlfriend` | `wife` | `map-of-stars`)
- `sender_name`, `recipient_name`
- `photo_links` (max 15, Cloudinary secure_url list)
- `video_link` (optional, Cloudinary secure_url)

დამატებითი ველები template-ის მიხედვით: ტექსტები, reasons, memory blocks.

Response:
```json
{
  "ok": true,
  "slug": "test-gift-1",
  "url": "https://your-domain.com/gift/test-gift-1/"
}
```

## შენიშვნა
ეს ვერსია ინახავს ფაილებს ლოკალურად. Production-ში deploy გააკეთე ისეთ ჰოსტზე სადაც persistent storage გაქვს.
