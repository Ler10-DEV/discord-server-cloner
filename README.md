# Discord Server Cloner

Discord sunucusundaki rolleri, kategorileri, metin/ses/duyuru kanallarını ve kanal izinlerini (permission overwrites) başka bir hedef sunucuya aktaran Node.js otomasyon aracı.

---

## Özellikler

- **Rol Klonlama:** Renk, yetkiler (permissions), ayrı gösterim (hoist) ve etiketlenebilirlik ayarlarını hiyerarşik sırayla aktarır.
- **Kategori ve Kanal Klonlama:** Metin, ses, duyuru, forum ve sahne kanallarını üst kategorileriyle birlikte oluşturur.
- **İzin Ayarları (Permission Overwrites):** Hangi rolün hangi kanalı görüp göremeyeceği ve kanala özel tüm izinleri eksiksiz olarak hedefe taşır.
- **Rate-Limit Koruması:** Discord API hız sınırlarına (429 Too Many Requests) takılmamak için asenkron gecikmeli güvenli istek motoru barındırır.
- **İsteğe Bağlı Temiz Kurulum (`CLEAN_TARGET_FIRST`):** İstenirse hedef sunucudaki eski kanalları ve rolleri temizleyip sıfırdan klonlar.

---

## Gereksinimler

- [Node.js](https://nodejs.org/) v16.9.0 veya üzeri
- Discord Developer Portal'dan oluşturulmuş bir Bot Hesabı

---

## Kurulum ve Yapılandırma

### 1. Bağımlılıkları Yükleyin
Proje klasöründe terminal açıp şu komutu çalıştırın:
```bash
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın
`.env.example` dosyasını `.env` olarak kopyalayın:
```bash
cp .env.example .env
```

`.env` dosyasını bir metin editörüyle açın ve doldurun:
```env
BOT_TOKEN=your_bot_token_here
SOURCE_GUILD_ID=kaynak_sunucu_id
TARGET_GUILD_ID=hedef_sunucu_id
CLEAN_TARGET_FIRST=false
```

#### Sunucu ID'si Nasıl Alınır?
1. Discord Ayarları > **Gelişmiş** > **Geliştirici Modu**'nu açın.
2. Kaynak ve hedef sunucu simgelerine sağ tıklayıp **"Sunucu Kimliğini Kopyala"** (Copy Server ID) deyin.

#### Botu Sunuculara Davet Etme
Botun hem **kaynak** hem de **hedef** sunucuda bulunması ve hedef sunucuda **Yönetici (Administrator)** yetkisine sahip olması gerekir.
- Discord Developer Portal > Applications > Botunuz > **OAuth2 > URL Generator**
- Scopes: `bot`
- Bot Permissions: `Administrator`
- Oluşan bağlantıyla botu her iki sunucuya da ekleyin.

> **Önemli:** Hedef sunucuda botun rolü, oluşturacağı rollerin ve diğer tüm rollerin **en üstünde** olmalıdır (Discord rol hiyerarşisi kuralı).

---

## Çalıştırma

```bash
npm start
# veya
node index.js
```

İşlem tamamlandığında konsolda aktarılan rol, kategori ve kanal sayısı listelenecek ve bot güvenle kapanacaktır.

---

## Bilinmesi Gerekenler

- **Mesajlar Kopyalanmaz:** Discord API kuralları gereği kanal içerisindeki geçmiş mesajlar kopyalanmaz; yalnızca sunucu yapısı, kanallar ve izinler taşınır.
- **Kullanıcı Bazlı Özel İzinler:** Hedef sunucuda aynı kullanıcılar bulunmayabileceği için yalnızca rol bazlı kanal izinleri taşınır.
- **Güvenlik Uyarısı:** `.env` dosyanızı ve bot tokenınızı asla GitHub gibi açık platformlarda paylaşmayın. Projede `.gitignore` hazır olarak yapılandırılmıştır.

---

## Lisans

MIT
