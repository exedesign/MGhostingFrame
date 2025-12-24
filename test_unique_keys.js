/**
 * Test Unique Key Generation
 * Bu script benzersiz key üretimi ve çakışma kontrolünü test eder
 */

const keyStorage = require('./backend/keyStorage');

async function testUniqueKeys() {
    console.log('=== UNIQUE KEY TEST ===\n');

    try {
        // Test 1: 10 benzersiz key üret
        console.log('Test 1: 10 Benzersiz Key Üretimi');
        console.log('-'.repeat(50));
        
        const generatedKeys = [];
        for (let i = 0; i < 10; i++) {
            const key = await keyStorage.generateUniqueKey();
            generatedKeys.push(key);
            console.log(`Key ${i + 1}: ${key}`);
        }

        // Çakışma kontrolü
        const uniqueKeys = new Set(generatedKeys);
        console.log(`\nÜretilen: ${generatedKeys.length}, Benzersiz: ${uniqueKeys.size}`);
        console.log(uniqueKeys.size === generatedKeys.length ? '✅ Hepsi benzersiz!' : '❌ Çakışma var!');

        // Test 2: Auto-increment key
        console.log('\n\nTest 2: Auto-Increment Key');
        console.log('-'.repeat(50));
        
        const nextKey1 = await keyStorage.getNextKey();
        console.log(`İlk Next Key: ${nextKey1}`);
        
        // Bir kayıt ekleyelim
        await keyStorage.saveRecord({
            videoPath: 'test.mp4',
            outputPath: 'test_watermarked.mp4',
            method: 'key-based',
            keys: [10, 11, 12, 13],
            sequence: '0123',
            key: nextKey1,
            userEmail: 'test@example.com',
            userName: 'Test User'
        });
        
        const nextKey2 = await keyStorage.getNextKey();
        console.log(`İkinci Next Key: ${nextKey2}`);
        console.log(nextKey2 === nextKey1 + 1 ? '✅ Auto-increment çalışıyor!' : '❌ Sorun var!');

        // Test 3: Key varlık kontrolü
        console.log('\n\nTest 3: Key Varlık Kontrolü');
        console.log('-'.repeat(50));
        
        const existingKey = generatedKeys[0];
        const nonExistingKey = 999999;
        
        const exists1 = await keyStorage.keyExists(existingKey);
        const exists2 = await keyStorage.keyExists(nonExistingKey);
        
        console.log(`Key ${existingKey} var mı? ${exists1 ? '✅ Evet' : '❌ Hayır'}`);
        console.log(`Key ${nonExistingKey} var mı? ${exists2 ? '❌ Evet (hata!)' : '✅ Hayır'}`);

        // Test 4: Key arama
        console.log('\n\nTest 4: Key ile Kayıt Arama');
        console.log('-'.repeat(50));
        
        const searchResults = await keyStorage.searchByKey(nextKey1);
        console.log(`Key ${nextKey1} için ${searchResults.length} kayıt bulundu`);
        
        if (searchResults.length > 0) {
            const record = searchResults[0];
            console.log(`  - Kullanıcı: ${record.userName}`);
            console.log(`  - Email: ${record.userEmail}`);
            console.log(`  - Video: ${record.videoPath}`);
        }

        // Test 5: İstatistikler
        console.log('\n\nTest 5: Sistem İstatistikleri');
        console.log('-'.repeat(50));
        
        const stats = await keyStorage.getStatistics();
        console.log(`Toplam Kayıt: ${stats.total}`);
        console.log(`Key-Based Kayıt: ${stats.keyBased}`);
        console.log(`Benzersiz Kullanıcı: ${stats.uniqueUsers}`);
        console.log(`Benzersiz Key: ${stats.uniqueKeys}`);

        // Test 6: Key aralığı testi
        console.log('\n\nTest 6: Key Aralığı Testi');
        console.log('-'.repeat(50));
        
        const testKeys = [];
        for (let i = 0; i < 5; i++) {
            testKeys.push(await keyStorage.generateUniqueKey());
        }
        
        const min = Math.min(...testKeys);
        const max = Math.max(...testKeys);
        console.log(`Min Key: ${min}`);
        console.log(`Max Key: ${max}`);
        console.log(`Aralık: ${min} - ${max} (6 haneli: ${min >= 100000 && max <= 999999 ? '✅' : '❌'})`);

        // Test 7: Timestamp bazlı key üretimi
        console.log('\n\nTest 7: Timestamp Bazlı Key Üretimi');
        console.log('-'.repeat(50));
        
        const timestampKeys = [];
        for (let i = 0; i < 10; i++) {
            const key = await keyStorage.generateUniqueKey();
            timestampKeys.push(key);
            
            // Kısa gecikme ekle
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Tümü benzersiz mi?
        const uniqueTimestampKeys = new Set(timestampKeys);
        console.log(`Üretilen: ${timestampKeys.length}, Benzersiz: ${uniqueTimestampKeys.size}`);
        console.log(uniqueTimestampKeys.size === timestampKeys.length ? '✅ Timestamp bazlı üretim çalışıyor!' : '❌ Çakışma var!');
        
        // Key'lerin zaman bazlı artışını kontrol et
        let isIncreasing = true;
        for (let i = 1; i < timestampKeys.length; i++) {
            if (timestampKeys[i] <= timestampKeys[i-1]) {
                isIncreasing = false;
                break;
            }
        }
        console.log(`Zaman bazlı artış: ${isIncreasing ? '✅ Var' : '⚠️ Yok (normal - modulo nedeniyle)'}`);
        
        console.log('\nÜretilen key\'ler:');
        timestampKeys.forEach((key, idx) => {
            console.log(`  ${idx + 1}. ${key}`);
        });

        // Test 8: Aynı milisaniyede key üretimi
        console.log('\n\nTest 8: Hızlı Ardışık Key Üretimi (Çakışma Testi)');
        console.log('-'.repeat(50));
        
        const rapidKeys = [];
        const startTime = Date.now();
        
        // Bekleme olmadan hızlı üret
        for (let i = 0; i < 5; i++) {
            rapidKeys.push(await keyStorage.generateUniqueKey());
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const uniqueRapidKeys = new Set(rapidKeys);
        console.log(`5 key ${duration}ms'de üretildi`);
        console.log(`Benzersiz: ${uniqueRapidKeys.size}/5`);
        console.log(uniqueRapidKeys.size === 5 ? '✅ Aynı milisaniyede bile çakışma yok!' : '❌ Çakışma var!');

        console.log('\n=== TEST TAMAMLANDI ===');

    } catch (error) {
        console.error('Test Hatası:', error);
    }
}

// Testi çalıştır
if (require.main === module) {
    testUniqueKeys().then(() => {
        console.log('\nTest scripti tamamlandı.');
        process.exit(0);
    });
}

module.exports = { testUniqueKeys };
