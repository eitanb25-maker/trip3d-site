/* places.js – מאגר אתרים מפורסמים לחיפוש מקומות (נכתב ידנית, בלי תלות ברשת).
   כל שורה: שם באנגלית | שם בעברית | כינויים (מופרדים בפסיק) | המדינה (בדיוק כפי שהיא באתר) | קו רוחב | קו אורך
   הקואורדינטות מדויקות בערך (כמה מאות מטרים) ונועדו לסימון על מפה של מדינה, לא לניווט.
   החיפוש מופעל מתוך index.html (geocode) לפני פנייה ל-OpenStreetMap. */
(function(){
const DATA=`
Universal Studios Japan|יוניברסל סטודיו יפן|יוניברסל סטודיו,יוניברסל סטודיוס,יוניברסל אוסקה,USJ,Universal Studios Osaka|Japan|34.6654|135.4323
Tokyo Disneyland|דיסנילנד טוקיו|דיסני טוקיו,Tokyo Disney Resort|Japan|35.6329|139.8804
Tokyo DisneySea|דיסני סי טוקיו|דיסנישי,דיסני סי|Japan|35.6267|139.8850
Tokyo Tower|מגדל טוקיו||Japan|35.6586|139.7454
Tokyo Skytree|סקייטרי טוקיו|טוקיו סקייטרי,Skytree|Japan|35.7101|139.8107
Senso-ji Temple|מקדש סנסוג'י|Sensoji,Asakusa,אסקוסה,סנסוגי|Japan|35.7148|139.7967
Shibuya Crossing|הצומת של שיבויה|שיבויה,Shibuya Scramble,Shibuya|Japan|35.6595|139.7005
Meiji Shrine|מקדש מייג'י|Meiji Jingu,מייג'י|Japan|35.6764|139.6993
Fushimi Inari Shrine|מקדש פושימי אינארי|Fushimi Inari,פושימי אינארי|Japan|34.9671|135.7727
Kinkaku-ji|קינקאקוג'י|Golden Pavilion,הפביליון הזהוב,קינקאקוגי|Japan|35.0394|135.7292
Kiyomizu-dera|קיומיזו-דרה|Kiyomizudera,קיומיזו|Japan|34.9949|135.7850
Osaka Castle|טירת אוסקה||Japan|34.6873|135.5262
Himeji Castle|טירת הימג'י|Himeji,הימגי|Japan|34.8394|134.6939
Mount Fuji|הר פוג'י|פוג'י,Fuji San,Mt Fuji,Fuji,פוגי|Japan|35.3606|138.7274
Itsukushima Shrine|מקדש איצוקושימה|Miyajima,מיאג'ימה|Japan|34.2960|132.3198
Hiroshima Peace Memorial Park|פארק השלום בהירושימה|Hiroshima Peace Park,הירושימה,Hiroshima|Japan|34.3955|132.4536
Nara Park|פארק נארה|Todai-ji,נארה,Nara|Japan|34.6851|135.8430
Arashiyama Bamboo Grove|יער הבמבוק ארשיימה|Arashiyama,ארשיימה|Japan|35.0094|135.6668
Gion Kyoto|גיון קיוטו|Gion,גיון|Japan|35.0037|135.7756
Dotonbori|דוטונבורי|Dotombori|Japan|34.6687|135.5013
Shirakawa-go|שירקאווה-גו|שירקאווה|Japan|36.2578|136.9060
Ghibli Museum|מוזיאון גיבלי|גיבלי|Japan|35.6962|139.5704
Ghibli Park|פארק גיבלי||Japan|35.1706|137.0869
Nijo Castle|טירת ניג'ו||Japan|35.0142|135.7480
Fuji-Q Highland|פוג'י-קיו היילנד|Fuji Q|Japan|35.4876|138.7787
Sanrio Puroland|סנריו פורולנד|הלו קיטי|Japan|35.6247|139.4312
Western Wall|הכותל המערבי|הכותל,Kotel,Wailing Wall|Israel|31.7767|35.2345
Dome of the Rock|כיפת הסלע|הר הבית,Temple Mount|Israel|31.7781|35.2360
Church of the Holy Sepulchre|כנסיית הקבר|כנסיית הקבר הקדוש|Israel|31.7784|35.2296
Tower of David|מגדל דוד|מצודת דוד,Citadel Jerusalem|Israel|31.7766|35.2275
Mount of Olives|הר הזיתים||Israel|31.7785|35.2450
Yad Vashem|יד ושם||Israel|31.7744|35.1759
Israel Museum|מוזיאון ישראל||Israel|31.7728|35.2043
Machane Yehuda Market|שוק מחנה יהודה|השוק,Mahane Yehuda|Israel|31.7848|35.2123
Masada|מצדה||Israel|31.3156|35.3536
Dead Sea|ים המלח||Israel|31.5590|35.4732
Ein Gedi|עין גדי||Israel|31.4614|35.3897
Sea of Galilee|הכנרת|ים כינרת,Kinneret,Lake Kinneret|Israel|32.8230|35.5880
Baha'i Gardens Haifa|הגנים הבהאיים|גני בהאים,Bahai Gardens|Israel|32.8147|34.9876
Old City of Acre|עכו העתיקה|Akko,Acre,עכו|Israel|32.9234|35.0689
Caesarea National Park|קיסריה|Caesarea|Israel|32.5000|34.8917
Tel Aviv Port|נמל תל אביב||Israel|32.0966|34.7740
Old Jaffa|יפו העתיקה|Jaffa,יפו|Israel|32.0542|34.7515
Rothschild Boulevard|שדרות רוטשילד||Israel|32.0636|34.7745
Carmel Market|שוק הכרמל||Israel|32.0680|34.7686
Azrieli Towers|מגדלי עזריאלי|עזריאלי|Israel|32.0742|34.7915
Ben Gurion Airport|נמל התעופה בן גוריון|נתב"ג,נתבג,TLV|Israel|32.0114|34.8867
Ramon Crater|מכתש רמון|Mitzpe Ramon,מצפה רמון|Israel|30.6094|34.8013
Coral Beach Eilat|חוף האלמוגים באילת|Eilat,אילת|Israel|29.5035|34.9183
Rosh Hanikra|ראש הנקרה||Israel|33.0904|35.1085
Basilica of the Annunciation|בזיליקת הבשורה|נצרת,Nazareth|Israel|32.7020|35.2977
Mount Hermon|הר החרמון|חרמון,Hermon|Israel|33.3167|35.7833
Gamla Nature Reserve|גמלא||Israel|32.9086|35.7467
Beit She'an National Park|בית שאן||Israel|32.5000|35.5019
Colosseum|הקולוסיאום|קולוסאום,Coliseum,Colosseo|Italy|41.8902|12.4922
Roman Forum|הפורום הרומי||Italy|41.8925|12.4853
Pantheon Rome|הפנתאון|פנתיאון,Pantheon|Italy|41.8986|12.4769
Trevi Fountain|מזרקת טרווי|טרווי|Italy|41.9009|12.4833
Spanish Steps|המדרגות הספרדיות||Italy|41.9060|12.4828
Piazza Navona|כיכר נבונה||Italy|41.8992|12.4731
Leaning Tower of Pisa|המגדל הנטוי של פיזה|פיזה,Pisa,מגדל פיזה|Italy|43.7230|10.3966
Milan Cathedral|הדואומו של מילאנו|Duomo di Milano,דואומו מילאנו,Duomo Milan|Italy|45.4641|9.1919
Florence Cathedral|הדואומו של פירנצה|Duomo Florence,Santa Maria del Fiore,פירנצה,Florence|Italy|43.7731|11.2560
Ponte Vecchio|פונטה וקיו||Italy|43.7680|11.2531
St. Mark's Square|כיכר סן מרקו|Piazza San Marco,ונציה,Venice|Italy|45.4343|12.3388
Rialto Bridge|גשר ריאלטו||Italy|45.4380|12.3359
Pompeii|פומפיי||Italy|40.7510|14.4869
Mount Vesuvius|הר וזוב|וזוב,Vesuvius|Italy|40.8224|14.4289
Amalfi Coast|חוף אמלפי|אמלפי,Amalfi|Italy|40.6340|14.6027
Cinque Terre|צ'ינקווטרה|צינקווטרה|Italy|44.1461|9.6439
Lake Como|אגם קומו|קומו,Como|Italy|45.9870|9.2570
Capri|קאפרי|קפרי|Italy|40.5532|14.2222
Gardaland|גרדלנד||Italy|45.4547|10.7124
Mount Etna|הר אתנה|אטנה,Etna|Italy|37.7510|14.9934
Valley of the Temples|עמק המקדשים|Agrigento|Italy|37.2908|13.5886
Taormina|טאורמינה||Italy|37.8516|15.2853
Matera|מטרה|Sassi di Matera|Italy|40.6663|16.6043
Verona Arena|ארנה ורונה|ורונה,Verona,Juliet's House|Italy|45.4390|10.9944
Alberobello|אלברובלו|Trulli|Italy|40.7842|17.2361
St. Peter's Basilica|בזיליקת פטרוס הקדוש|סן פיטרו,כנסיית פטרוס הקדוש,Vatican,הוותיקן|Vatican|41.9022|12.4539
Vatican Museums|מוזיאוני הוותיקן|הקפלה הסיסטינית,Sistine Chapel|Vatican|41.9065|12.4536
Eiffel Tower|מגדל אייפל|אייפל,Tour Eiffel|France|48.8584|2.2945
Louvre Museum|מוזיאון הלובר|לובר,Louvre|France|48.8606|2.3376
Notre-Dame de Paris|נוטרדאם|נוטרדאם פריז,Notre Dame|France|48.8530|2.3499
Arc de Triomphe|שער הניצחון|שער הניצחון פריז|France|48.8738|2.2950
Sacre-Coeur|הבזיליקה סקרה קר|סקרה קר,Sacre Coeur,מונמרטר,Montmartre|France|48.8867|2.3431
Champs-Elysees|שאנז אליזה|שאנז אליזה פריז,Champs Elysees|France|48.8698|2.3078
Musee d'Orsay|מוזיאון אורסיי|אורסיי,Orsay|France|48.8600|2.3266
Disneyland Paris|דיסנילנד פריז|דיסני פריז|France|48.8722|2.7758
Palace of Versailles|ארמון ורסאי|ורסאי,Versailles|France|48.8049|2.1204
Mont Saint-Michel|הר סן מישל|מון סן מישל,Mont Saint Michel|France|48.6361|-1.5115
Pont du Gard|פון דו גאר||France|43.9475|4.5350
Promenade des Anglais|טיילת האנגלים|ניס,Nice|France|43.6950|7.2650
Cannes Film Festival Palace|פסטיבל קאן|קאן,Cannes|France|43.5513|7.0170
Chamonix Mont Blanc|שמוני|Mont Blanc,מון בלאן,Chamonix|France|45.9237|6.8694
Carcassonne|קרקסון||France|43.2060|2.3640
Centre Pompidou|מרכז פומפידו|פומפידו,Pompidou|France|48.8606|2.3522
Moulin Rouge|מולן רוז'|מולן רוז|France|48.8841|2.3323
Strasbourg Cathedral|קתדרלת שטרסבורג|שטרסבורג,Strasbourg|France|48.5819|7.7507
Big Ben|ביג בן|בגבן,Elizabeth Tower,Palace of Westminster|United Kingdom|51.5007|-0.1246
Tower of London|מגדל לונדון||United Kingdom|51.5081|-0.0759
Tower Bridge|טאואר ברידג'|גשר המגדל,טאואר ברידג|United Kingdom|51.5055|-0.0754
Buckingham Palace|ארמון בקינגהאם|בקינגהאם|United Kingdom|51.5014|-0.1419
London Eye|עין לונדון|הגלגל של לונדון|United Kingdom|51.5033|-0.1195
British Museum|המוזיאון הבריטי||United Kingdom|51.5194|-0.1270
Westminster Abbey|מנזר וסטמינסטר|וסטמינסטר|United Kingdom|51.4994|-0.1273
St Paul's Cathedral|קתדרלת סנט פול||United Kingdom|51.5138|-0.0984
Stonehenge|סטונהנג'|סטונהנג|United Kingdom|51.1789|-1.8262
Edinburgh Castle|טירת אדינבורו|אדינבורו,Edinburgh|United Kingdom|55.9486|-3.1999
Loch Ness|לוך נס||United Kingdom|57.3229|-4.4244
Giant's Causeway|סוללת הענק||United Kingdom|55.2408|-6.5116
Warner Bros Studio Tour London|הסטודיו של הארי פוטר|Harry Potter Studio Tour,הארי פוטר לונדון|United Kingdom|51.6900|-0.4189
University of Oxford|אוניברסיטת אוקספורד|אוקספורד,Oxford|United Kingdom|51.7548|-1.2544
University of Cambridge|אוניברסיטת קיימברידג'|קיימברידג',Cambridge|United Kingdom|52.2053|0.1218
Windsor Castle|טירת וינדזור|וינדזור|United Kingdom|51.4839|-0.6044
Trafalgar Square|כיכר טרפלגר||United Kingdom|51.5080|-0.1281
Camden Market|שוק קמדן||United Kingdom|51.5415|-0.1465
Wembley Stadium|אצטדיון וומבלי|וומבלי|United Kingdom|51.5560|-0.2796
Old Trafford|אולד טראפורד|מנצ'סטר יונייטד|United Kingdom|53.4631|-2.2913
Anfield|אנפילד|ליברפול|United Kingdom|53.4308|-2.9608
Emirates Stadium|האמירטס|ארסנל,Arsenal|United Kingdom|51.5549|-0.1084
Roman Baths Bath|המרחצאות הרומיים באת'|באת',Bath|United Kingdom|51.3811|-2.3590
Legoland Windsor|לגולנד וינדזור||United Kingdom|51.4638|-0.6522
Sagrada Familia|הסגרדה פמיליה|סגרדה פמיליה,סגראדה פמיליה|Spain|41.4036|2.1744
Park Guell|פארק גואל|Park Güell|Spain|41.4145|2.1527
La Rambla|לה רמבלה|רמבלה,Las Ramblas|Spain|41.3797|2.1746
Casa Batllo|קאסה בטיו|Casa Batlló|Spain|41.3917|2.1649
Camp Nou|קאמפ נואו|ברצלונה|Spain|41.3809|2.1228
Santiago Bernabeu|סנטיאגו ברנבאו|ברנבאו,ריאל מדריד,Real Madrid|Spain|40.4531|-3.6883
Prado Museum|מוזיאון הפראדו|פראדו,Prado|Spain|40.4138|-3.6921
Royal Palace of Madrid|ארמון המלוכה במדריד||Spain|40.4180|-3.7143
Plaza Mayor Madrid|פלאסה מאיור||Spain|40.4155|-3.7074
Alhambra|האלהמברה|אלהמברה,גרנדה,Granada|Spain|37.1760|-3.5881
Mezquita of Cordoba|המסגד של קורדובה|קורדובה,Cordoba|Spain|37.8790|-4.7794
Seville Cathedral|קתדרלת סביליה|סביליה,Giralda,Seville|Spain|37.3858|-5.9931
Plaza de Espana Seville|פלאסה דה אספניה||Spain|37.3772|-5.9869
Guggenheim Museum Bilbao|גוגנהיים בילבאו|בילבאו,Bilbao|Spain|43.2687|-2.9340
Toledo|טולדו||Spain|39.8628|-4.0273
Dalt Vila Ibiza|איביזה|Ibiza|Spain|38.9066|1.4380
Teide National Park|הר טיידה|טיידה,טנריפה,Teide|Spain|28.2723|-16.6425
Montserrat|מונסראט||Spain|41.5933|1.8377
PortAventura|פורט אבנטורה||Spain|41.0881|1.1560
Santiago de Compostela Cathedral|קתדרלת סנטיאגו דה קומפוסטלה||Spain|42.8806|-8.5447
City of Arts and Sciences Valencia|עיר האמנויות והמדעים|ולנסיה,Valencia|Spain|39.4543|-0.3503
Brandenburg Gate|שער ברנדנבורג||Germany|52.5163|13.3777
East Side Gallery|חומת ברלין|Berlin Wall,אסט סייד גלרי|Germany|52.5050|13.4397
Reichstag|הרייכסטאג|בונדסטאג|Germany|52.5186|13.3762
Holocaust Memorial Berlin|האנדרטה לשואה בברלין|אנדרטת השואה ברלין|Germany|52.5139|13.3787
Museum Island Berlin|אי המוזיאונים|Pergamon,פרגמון|Germany|52.5169|13.4019
Neuschwanstein Castle|טירת נוישוונשטיין|נוישוונשטיין|Germany|47.5576|10.7498
Cologne Cathedral|קתדרלת קלן|קלן,Cologne|Germany|50.9413|6.9583
Marienplatz|מריינפלאץ|מינכן,Munich|Germany|48.1374|11.5755
Oktoberfest|אוקטוברפסט|Theresienwiese|Germany|48.1315|11.5497
Heidelberg Castle|טירת היידלברג|היידלברג,Heidelberg|Germany|49.4106|8.7159
Europa-Park|אירופה פארק|Europapark|Germany|48.2660|7.7212
Miniatur Wunderland|מיניאטור וונדרלנד|המבורג|Germany|53.5439|9.9886
Dachau Memorial|דכאו|Dachau|Germany|48.2700|11.4687
Allianz Arena|אליאנץ ארנה|באיירן מינכן|Germany|48.2188|11.6247
Frauenkirche Dresden|פראואנקירכה דרזדן|דרזדן,Dresden|Germany|51.0519|13.7416
Black Forest|היער השחור||Germany|48.0000|8.2000
Anne Frank House|בית אנה פרנק||Netherlands|52.3752|4.8840
Rijksmuseum|הרייקסמוזיאון|רייקס מוזיאון|Netherlands|52.3600|4.8852
Van Gogh Museum|מוזיאון ואן גוך||Netherlands|52.3584|4.8811
Keukenhof|קייקנהוף|שדות הטוליפים|Netherlands|52.2697|4.5463
Zaanse Schans|זאנסה סחאנס|טחנות הרוח|Netherlands|52.4749|4.8171
Efteling|אפטלינג||Netherlands|51.6496|5.0437
Atomium|האטומיום|בריסל|Belgium|50.8949|4.3415
Grand Place Brussels|הגראנד פלאס|בריסל,Brussels|Belgium|50.8467|4.3525
Manneken Pis|מנקן פיס||Belgium|50.8450|4.3500
Bruges Belfry|ברוז'|Bruges,מגדל הפעמונים ברוז'|Belgium|51.2085|3.2250
Acropolis of Athens|האקרופוליס|אקרופוליס,אתונה,Acropolis|Greece|37.9715|23.7257
Parthenon|הפרתנון||Greece|37.9715|23.7267
Oia Santorini|אויה סנטוריני|סנטוריני,Oia,Santorini|Greece|36.4618|25.3753
Meteora|מטאורה||Greece|39.7217|21.6306
Delphi|דלפי||Greece|38.4824|22.5010
Knossos|קנוסוס|כרתים,Crete|Greece|35.2980|25.1631
Mykonos Windmills|מיקונוס|Mykonos|Greece|37.4467|25.3289
Rhodes Old Town|רודוס העתיקה|רודוס,Rhodes|Greece|36.4421|28.2278
Hagia Sophia|איה סופיה|איה סופיה איסטנבול,Ayasofya|Turkey|41.0086|28.9802
Blue Mosque|המסגד הכחול|Sultanahmet|Turkey|41.0054|28.9768
Topkapi Palace|ארמון טופקאפי||Turkey|41.0115|28.9834
Grand Bazaar Istanbul|הבזאר הגדול|איסטנבול,Istanbul|Turkey|41.0108|28.9680
Galata Tower|מגדל גלאטה||Turkey|41.0256|28.9741
Cappadocia|קפדוקיה|Goreme,גורמה|Turkey|38.6431|34.8289
Pamukkale|פאמוקאלה||Turkey|37.9137|29.1187
Ephesus|אפסוס||Turkey|37.9396|27.3417
Great Pyramid of Giza|הפירמידות בגיזה|פירמידות גיזה,Pyramids of Giza,הפירמידה הגדולה,Pyramids|Egypt|29.9792|31.1342
Sphinx|הספינקס||Egypt|29.9753|31.1376
Karnak Temple|מקדש קרנק|קרנק,Karnak|Egypt|25.7188|32.6573
Valley of the Kings|עמק המלכים|לוקסור,Luxor|Egypt|25.7402|32.6014
Abu Simbel|אבו סימבל||Egypt|22.3372|31.6258
Sharm El Sheikh|שארם א-שייח'|שארם,Sharm|Egypt|27.9158|34.3300
Petra|פטרה|Treasury Petra,האוצר|Jordan|30.3285|35.4444
Wadi Rum|ואדי רם||Jordan|29.5778|35.4189
Jerash|ג'רש|גרש|Jordan|32.2811|35.8997
Burj Khalifa|בורג' ח'ליפה|בורג' חליפה,בורג חליפה,דובאי,Dubai|United Arab Emirates|25.1972|55.2744
Dubai Mall|דובאי מול||United Arab Emirates|25.1985|55.2796
Palm Jumeirah|פאלם ג'ומיירה|דקל דובאי|United Arab Emirates|25.1124|55.1390
Burj Al Arab|בורג' אל ערב||United Arab Emirates|25.1412|55.1853
Sheikh Zayed Grand Mosque|מסגד שיח' זאיד|אבו דאבי,Abu Dhabi|United Arab Emirates|24.4128|54.4747
Ferrari World Abu Dhabi|פרארי וורלד|Yas Island,פרארי אבו דאבי|United Arab Emirates|24.4836|54.6071
Statue of Liberty|פסל החירות||United States of America|40.6892|-74.0445
Empire State Building|האמפייר סטייט בילדינג|אמפייר סטייט|United States of America|40.7484|-73.9857
Times Square|טיימס סקוור|כיכר טיימס|United States of America|40.7580|-73.9855
Central Park|סנטרל פארק||United States of America|40.7829|-73.9654
Brooklyn Bridge|גשר ברוקלין||United States of America|40.7061|-73.9969
One World Trade Center|מגדל הסחר העולמי|9/11 Memorial,Ground Zero|United States of America|40.7127|-74.0134
Golden Gate Bridge|גשר שער הזהב|גולדן גייט|United States of America|37.8199|-122.4783
Alcatraz|אלקטרז||United States of America|37.8267|-122.4230
Hollywood Sign|שלט הוליווד|הוליווד,Hollywood|United States of America|34.1341|-118.3215
Universal Studios Hollywood|יוניברסל סטודיוס הוליווד|יוניברסל לוס אנג'לס,יוניברסל סטודיו הוליווד|United States of America|34.1381|-118.3534
Universal Orlando Resort|יוניברסל סטודיוס פלורידה|יוניברסל אורלנדו,Universal Studios Florida,Islands of Adventure|United States of America|28.4720|-81.4678
Walt Disney World|וולט דיסני וורלד|דיסני וורלד,Magic Kingdom,דיסני אורלנדו|United States of America|28.3852|-81.5639
Disneyland California|דיסנילנד קליפורניה|דיסנילנד אנהיים,Disneyland Anaheim|United States of America|33.8121|-117.9190
Grand Canyon|גרנד קניון||United States of America|36.1069|-112.1129
Yosemite National Park|יוסמיטי|Yosemite|United States of America|37.8651|-119.5383
Yellowstone National Park|ילוסטון|Yellowstone|United States of America|44.4280|-110.5885
Niagara Falls American Falls|מפלי הניאגרה האמריקאיים|Niagara Falls,Niagara,מפלי הניאגרה|United States of America|43.0828|-79.0747
Las Vegas Strip|הסטריפ של לאס וגאס|לאס וגאס,Las Vegas,Vegas|United States of America|36.1147|-115.1728
Hoover Dam|סכר הובר||United States of America|36.0161|-114.7377
Mount Rushmore|הר ראשמור||United States of America|43.8791|-103.4591
White House|הבית הלבן||United States of America|38.8977|-77.0365
Lincoln Memorial|אנדרטת לינקולן||United States of America|38.8893|-77.0502
US Capitol|הקפיטול|Capitol|United States of America|38.8899|-77.0091
Space Needle|ספייס נידל|סיאטל,Seattle|United States of America|47.6205|-122.3493
Kennedy Space Center|מרכז החלל קנדי|קייפ קנוורל|United States of America|28.5729|-80.6490
Pearl Harbor|פרל הארבור||United States of America|21.3649|-157.9500
Waikiki Beach|חוף וואיקיקי|הוואי,Hawaii,וויקיקי|United States of America|21.2767|-157.8270
Monument Valley|מונומנט ואלי||United States of America|36.9980|-110.0985
Antelope Canyon|אנטילופ קניון||United States of America|36.8619|-111.3743
Zion National Park|זיון|Zion|United States of America|37.2982|-113.0263
Bryce Canyon|ברייס קניון||United States of America|37.5930|-112.1871
Arches National Park|ארצ'ס|ארקס,Arches|United States of America|38.7331|-109.5925
Joshua Tree National Park|ג'ושוע טרי|Joshua Tree|United States of America|33.8734|-115.9010
Santa Monica Pier|מזח סנטה מוניקה|סנטה מוניקה|United States of America|34.0092|-118.4973
Madison Square Garden|מדיסון סקוור גארדן||United States of America|40.7505|-73.9934
Metropolitan Museum of Art|המוזיאון המטרופוליטן|המט,The Met|United States of America|40.7794|-73.9632
MoMA|מומה|Museum of Modern Art|United States of America|40.7614|-73.9776
Wrigley Field|ריגלי פילד|שיקגו|United States of America|41.9484|-87.6553
Cloud Gate|הבין שיקגו|The Bean,Millennium Park,מילניום פארק|United States of America|41.8827|-87.6233
Willis Tower|מגדל וויליס|Sears Tower|United States of America|41.8789|-87.6359
French Quarter New Orleans|הרובע הצרפתי ניו אורלינס|ניו אורלינס,New Orleans|United States of America|29.9584|-90.0644
Graceland|גרייסלנד|אלביס,Elvis|United States of America|35.0453|-90.0235
CN Tower|מגדל סי אן|CN Tower Toronto,טורונטו,Toronto|Canada|43.6426|-79.3871
Banff National Park|בנף|Lake Louise,אגם לואיז,Banff|Canada|51.4968|-115.9281
Horseshoe Falls|מפלי הניאגרה הקנדיים|Niagara Falls,Niagara,מפלי הניאגרה|Canada|43.0793|-79.0848
Old Quebec|קוויבק העתיקה|Chateau Frontenac,קוויבק,Quebec City|Canada|46.8123|-71.2054
Parliament Hill Ottawa|גבעת הפרלמנט|אוטווה,Ottawa|Canada|45.4236|-75.7009
Moraine Lake|אגם מורן||Canada|51.3217|-116.1860
Capilano Suspension Bridge|גשר קפילנו|ונקובר,Vancouver|Canada|49.3429|-123.1149
Stanley Park Vancouver|סטנלי פארק||Canada|49.3043|-123.1443
Christ the Redeemer|ישו הגואל|הפסל של ישו בריו,Cristo Redentor|Brazil|-22.9519|-43.2105
Sugarloaf Mountain|הר הסוכר|פאו די אסוקר|Brazil|-22.9486|-43.1566
Copacabana Beach|חוף קופקבנה|קופקבנה,Copacabana|Brazil|-22.9711|-43.1822
Iguazu Falls Brazilian side|מפלי האיגואסו הברזילאיים|Iguacu Falls,Iguazu,איגואסו,מפלי האיגואסו|Brazil|-25.6870|-54.4390
Iguazu Falls Argentine side|מפלי האיגואסו הארגנטינאיים|Devil's Throat,Iguazu,איגואסו,מפלי האיגואסו|Argentina|-25.6953|-54.4367
Machu Picchu|מאצ'ו פיצ'ו|מצ'ו פיצ'ו,מאצו פיצו|Peru|-13.1631|-72.5450
Cusco|קוסקו|Cuzco|Peru|-13.5319|-71.9675
Rainbow Mountain|הר הקשת|Vinicunca|Peru|-13.8700|-71.3030
Lake Titicaca|אגם טיטיקקה||Peru|-15.8402|-69.9890
Salar de Uyuni|מישורי המלח אוניוני|Uyuni Salt Flat,סלאר דה אוניוני|Bolivia|-20.1338|-67.4891
Chichen Itza|צ'יצ'ן איצה|צצן איצה|Mexico|20.6843|-88.5678
Teotihuacan|טאוטיוואקאן|טאוטיהואקן|Mexico|19.6925|-98.8438
Tulum|טולום||Mexico|20.2114|-87.4654
Cancun|קנקון|Cancún|Mexico|21.1619|-86.8515
Zocalo Mexico City|הזוקאלו|מקסיקו סיטי,Mexico City|Mexico|19.4326|-99.1332
Perito Moreno Glacier|קרחון פריטו מורנו|פריטו מורנו|Argentina|-50.4967|-73.1377
Obelisco Buenos Aires|האובליסק|בואנוס איירס,Buenos Aires|Argentina|-34.6037|-58.3816
Torres del Paine|טורס דל פיינה||Chile|-51.0000|-73.0000
Angel Falls|מפל אנחל||Venezuela|5.9701|-62.5362
Miraflores Locks Panama Canal|תעלת פנמה|Panama Canal|Panama|9.0128|-79.5936
Old Havana|הוואנה העתיקה|הוואנה,Havana|Cuba|23.1366|-82.3586
Walled City of Cartagena|קרטחנה|Cartagena|Colombia|10.4236|-75.5509
Tikal|טיקאל||Guatemala|17.2220|-89.6237
Arenal Volcano|הר הגעש ארנל|ארנל|Costa Rica|10.4626|-84.7032
Great Wall of China Mutianyu|החומה הגדולה של סין|החומה הסינית,Great Wall,Badaling,Mutianyu|China|40.4319|116.5704
Forbidden City|העיר האסורה||China|39.9163|116.3972
Tiananmen Square|כיכר טיאננמן||China|39.9087|116.3975
Temple of Heaven|מקדש השמיים||China|39.8822|116.4066
Summer Palace|ארמון הקיץ||China|39.9999|116.2755
Terracotta Army|צבא הטרקוטה|שיאן,Xi'an|China|34.3841|109.2785
The Bund|הבונד שנגחאי|שנגחאי,Shanghai,Bund|China|31.2400|121.4900
Oriental Pearl Tower|מגדל פנינת המזרח||China|31.2397|121.4998
Shanghai Disneyland|דיסנילנד שנגחאי||China|31.1440|121.6580
Hong Kong Disneyland|דיסנילנד הונג קונג||China|22.3130|114.0413
Universal Beijing Resort|יוניברסל בייג'ינג|Universal Studios Beijing,יוניברסל סטודיוס בייג'ינג|China|39.8508|116.6800
Zhangjiajie|ג'אנגג'יאג'ה|Avatar mountains,הרי אווטאר|China|29.3167|110.4333
Guilin Li River|גילין|נהר לי,Guilin|China|25.2736|110.2900
Potala Palace|ארמון פוטלה|לאסה,Lhasa|China|29.6578|91.1172
Victoria Peak Hong Kong|הונג קונג|Hong Kong,Victoria Harbour|China|22.2759|114.1455
Angkor Wat|אנגקור וואט||Cambodia|13.4125|103.8670
Ha Long Bay|מפרץ הא לונג|Halong Bay|Vietnam|20.9101|107.1839
Hoi An Ancient Town|הוי אן|Hoi An|Vietnam|15.8801|108.3380
Taj Mahal|טאג' מהאל|טאג מהל,Taj Mahal Agra,אגרה|India|27.1751|78.0421
Red Fort Delhi|המבצר האדום|דלהי,Red Fort|India|28.6562|77.2410
India Gate|שער הודו||India|28.6129|77.2295
Golden Temple Amritsar|המקדש הזהוב|אמריצר,Golden Temple|India|31.6200|74.8765
Hawa Mahal|האווה מהאל|ג'איפור,Jaipur|India|26.9239|75.8267
Varanasi Ghats|ורנסי|Varanasi,Benares|India|25.3109|83.0107
Goa Beaches|גואה|Goa|India|15.2993|74.1240
Kerala Backwaters|קראלה|Alleppey,Kerala|India|9.4981|76.3388
Marina Bay Sands|מרינה ביי סנדס||Singapore|1.2834|103.8607
Gardens by the Bay|הגנים על המפרץ|גרדנס ביי דה ביי|Singapore|1.2816|103.8636
Universal Studios Singapore|יוניברסל סטודיוס סינגפור|יוניברסל סינגפור,יוניברסל סטודיו סינגפור|Singapore|1.2540|103.8238
Sentosa|סנטוזה||Singapore|1.2494|103.8303
Merlion|המרליון||Singapore|1.2868|103.8545
Petronas Twin Towers|מגדלי פטרונס|קואלה לומפור,Petronas|Malaysia|3.1579|101.7116
Batu Caves|מערות בטו||Malaysia|3.2379|101.6840
Grand Palace Bangkok|הארמון הגדול|בנגקוק,Bangkok|Thailand|13.7500|100.4913
Wat Arun|וואט ארון||Thailand|13.7437|100.4889
Phi Phi Islands|איי פי פי|פי פי,Koh Phi Phi|Thailand|7.7407|98.7784
Big Buddha Phuket|הבודהה הגדול פוקט|פוקט,Phuket|Thailand|7.8277|98.3126
Doi Suthep|דוי סוטפ|צ'יאנג מאי,Chiang Mai|Thailand|18.8048|98.9216
Ayutthaya|איוטאיה||Thailand|14.3532|100.5689
Borobudur|בורובודור||Indonesia|-7.6079|110.2038
Tanah Lot|טאנה לוט|באלי,Bali|Indonesia|-8.6212|115.0868
Ubud Monkey Forest|אובוד|יער הקופים,Ubud|Indonesia|-8.5188|115.2588
Komodo National Park|קומודו|Komodo|Indonesia|-8.5500|119.4900
Mount Bromo|הר ברומו|ברומו|Indonesia|-7.9425|112.9530
Gyeongbokgung Palace|ארמון גיאונגבוקגונג|סיאול,Seoul|South Korea|37.5796|126.9770
N Seoul Tower|מגדל סיאול|Namsan Tower|South Korea|37.5512|126.9882
Lotte World|לוטה וורלד||South Korea|37.5111|127.0980
Everland|אוורלנד||South Korea|37.2937|127.2025
Hallasan Jeju|האי ג'ג'ו|הר האלה,Jeju|South Korea|33.3617|126.5292
Bulguksa|בולגוקסה|גיונגג'ו,Gyeongju|South Korea|35.7901|129.3320
Taipei 101|טייפה 101|טאיפיי,Taipei|Taiwan|25.0339|121.5645
Sun Moon Lake|אגם הירח והשמש||Taiwan|23.8567|120.9154
Everest Base Camp|הר האוורסט|אוורסט,Everest|Nepal|28.0026|86.8528
Pashupatinath Temple|פשופטינת|קטמנדו,Kathmandu|Nepal|27.7106|85.3487
Phewa Lake Pokhara|פוקרה|Pokhara|Nepal|28.2096|83.9856
Sigiriya|סיגיריה||Sri Lanka|7.9570|80.7603
Medeu Almaty|אלמאטי|Almaty|Kazakhstan|43.1572|77.0589
Registan Samarkand|רג'יסטן|סמרקנד,Samarkand|Uzbekistan|39.6547|66.9758
Tiger's Nest Monastery|מנזר קן הנמר|Paro Taktsang|Bhutan|27.4916|89.3638
Shwedagon Pagoda|פגודת שוודגון|יאנגון,Yangon|Myanmar|16.7983|96.1496
Bagan|באגאן||Myanmar|21.1717|94.8585
Luang Prabang|לואנג פראבאנג||Laos|19.8856|102.1347
Genghis Khan Statue|פסל ג'ינגיס חאן|אולאנבאטור|Mongolia|47.8084|107.5304
Prague Castle|טירת פראג|פראג,Prague|Czech Republic|50.0910|14.4009
Charles Bridge|גשר קארל|פראג|Czech Republic|50.0865|14.4114
Old Town Square Prague|העיר העתיקה פראג|השעון האסטרונומי,Astronomical Clock|Czech Republic|50.0875|14.4213
Schonbrunn Palace|ארמון שנברון|וינה,Vienna,Schönbrunn|Austria|48.1845|16.3122
St. Stephen's Cathedral Vienna|קתדרלת סטפן הקדוש||Austria|48.2084|16.3731
Hallstatt|הלשטאט||Austria|47.5622|13.6493
Salzburg|זלצבורג|Mozart House|Austria|47.7981|13.0463
Hungarian Parliament Building|בניין הפרלמנט בודפשט|פרלמנט בודפשט,בודפשט,Budapest Parliament|Hungary|47.5071|19.0456
Fisherman's Bastion|מבצר הדייגים||Hungary|47.5022|19.0348
Szechenyi Thermal Bath|מרחצאות סצ'ני|Széchenyi|Hungary|47.5186|19.0818
Auschwitz-Birkenau|אושוויץ|Auschwitz,בירקנאו|Poland|50.0261|19.2036
Wawel Castle|טירת וואוול|קרקוב,Krakow,Cracow|Poland|50.0540|19.9352
Warsaw Old Town|העיר העתיקה בוורשה|ורשה,Warsaw|Poland|52.2497|21.0122
Wieliczka Salt Mine|מכרה המלח וליצ'קה||Poland|49.9833|20.0556
Red Square|הכיכר האדומה|מוסקבה,Moscow,Kremlin,הקרמלין|Russia|55.7539|37.6208
Saint Basil's Cathedral|קתדרלת סנט בייסיל||Russia|55.7525|37.6231
Hermitage Museum|ההרמיטאז'|סנט פטרבורג,Saint Petersburg|Russia|59.9398|30.3146
Lake Baikal|אגם בייקל|Baikal|Russia|53.5587|108.1650
Dubrovnik Old Town|דוברובניק|Dubrovnik|Croatia|42.6411|18.1077
Plitvice Lakes|אגמי פליטביצה|Plitvice|Croatia|44.8654|15.5820
Diocletian's Palace Split|ארמון דיוקלטיאנוס|ספליט,Split|Croatia|43.5081|16.4402
Lake Bled|אגם בלד|Bled|Slovenia|46.3625|14.0938
Blue Lagoon Iceland|הלגונה הכחולה||Iceland|63.8804|-22.4495
Gullfoss|גולפוס||Iceland|64.3271|-20.1199
Hallgrimskirkja|הלגרימסקירקיה|רייקיאוויק,Reykjavik|Iceland|64.1417|-21.9266
Little Mermaid Statue|בת הים הקטנה|קופנהגן,Copenhagen|Denmark|55.6929|12.5993
Tivoli Gardens|גני טיבולי|Tivoli|Denmark|55.6736|12.5681
Legoland Billund|לגולנד בילונד|לגו,Lego|Denmark|55.7350|9.1269
Nyhavn|ניהבן||Denmark|55.6798|12.5906
Vasa Museum|מוזיאון ואסה|שטוקהולם,Stockholm|Sweden|59.3280|18.0910
Gamla Stan|גמלה סטן||Sweden|59.3251|18.0711
Geirangerfjord|פיורד גיירנגר|Geiranger|Norway|62.1049|7.2059
Preikestolen|פרייקסטולן|Pulpit Rock|Norway|58.9863|6.1900
Oslo Opera House|בית האופרה אוסלו|אוסלו,Oslo|Norway|59.9076|10.7529
Trolltunga|טרולטונגה||Norway|60.1243|6.7400
Helsinki Cathedral|קתדרלת הלסינקי|הלסינקי,Helsinki|Finland|60.1704|24.9522
Santa Claus Village|כפר סנטה קלאוס|רובניעמי,Rovaniemi|Finland|66.5436|25.8470
Pena Palace Sintra|ארמון פנה|סינטרה,Sintra|Portugal|38.7876|-9.3906
Belem Tower|מגדל בלם|ליסבון,Lisbon|Portugal|38.6916|-9.2160
Livraria Lello|ספריית לאלו|פורטו,Porto|Portugal|41.1469|-8.6149
Cliffs of Moher|צוקי מוהר||Ireland|52.9715|-9.4309
Guinness Storehouse|מפעל גינס|דבלין,Dublin|Ireland|53.3419|-6.2867
Ring of Kerry|טבעת קרי||Ireland|51.8900|-9.9000
Matterhorn|המטרהורן|Matterhorn Zermatt,צרמט,זרמט|Switzerland|45.9763|7.6586
Jungfraujoch|יונגפראו|Jungfrau|Switzerland|46.5475|7.9851
Chillon Castle|טירת שיון|שיון|Switzerland|46.4143|6.9272
Chapel Bridge Lucerne|גשר הקפלה|לוצרן,Lucerne|Switzerland|47.0517|8.3074
Interlaken|אינטרלאקן||Switzerland|46.6863|7.8632
Rhine Falls|מפלי הריין||Switzerland|47.6779|8.6150
Bran Castle|טירת בראן|דרקולה,Dracula|Romania|45.5149|25.3672
Palace of the Parliament Bucharest|ארמון הפרלמנט|בוקרשט,Bucharest|Romania|44.4275|26.0874
Rila Monastery|מנזר רילה||Bulgaria|42.1335|23.3400
Stari Most Mostar|הגשר העתיק במוסטר|מוסטר,Mostar|Bosnia and Herzegovina|43.3375|17.8150
Bay of Kotor|מפרץ קוטור|קוטור,Kotor|Montenegro|42.4247|18.7712
Belgrade Fortress|מבצר בלגרד|בלגרד,Kalemegdan|Republic of Serbia|44.8231|20.4505
Narikala Fortress Tbilisi|נריקלה|טביליסי,Tbilisi|Georgia|41.6877|44.8081
Gergeti Trinity Church|כנסיית גרגטי|קזבגי,Kazbegi|Georgia|42.6628|44.6199
Tatev Monastery|מנזר טטב||Armenia|39.3800|46.2500
Flame Towers Baku|מגדלי הלהבה|באקו,Baku|Azerbaijan|40.3597|49.8260
Kyiv Pechersk Lavra|קייב פצ'רסק|קייב,Kyiv,Kiev|Ukraine|50.4346|30.5575
Valletta|ואלטה||Malta|35.8997|14.5146
Paphos Archaeological Park|פאפוס|Paphos|Cyprus|34.7565|32.4056
Ayia Napa|איה נאפה|Agia Napa|Cyprus|34.9823|34.0007
Victoria Falls|מפלי ויקטוריה||Zimbabwe|-17.9243|25.8572
Table Mountain|הר השולחן|קייפטאון,Cape Town|South Africa|-33.9628|18.4098
Cape of Good Hope|כף התקווה הטובה||South Africa|-34.3568|18.4740
Kruger National Park|קרוגר|Kruger|South Africa|-23.9884|31.5547
Robben Island|רובן איילנד||South Africa|-33.8068|18.3710
Serengeti|סרנגטי||United Republic of Tanzania|-2.3333|34.8333
Mount Kilimanjaro|הר קילימנג'רו|קילימנג'רו,Kilimanjaro|United Republic of Tanzania|-3.0674|37.3556
Stone Town Zanzibar|זנזיבר|סטון טאון,Zanzibar|United Republic of Tanzania|-6.1659|39.1925
Masai Mara|מסאי מארה||Kenya|-1.4061|35.0142
Jemaa el-Fnaa|ג'מע אל-פנא|מרקש,Marrakech,Marrakesh|Morocco|31.6259|-7.9891
Chefchaouen|שפשאוון||Morocco|35.1688|-5.2636
Hassan II Mosque|מסגד חסן השני|קזבלנקה,Casablanca|Morocco|33.6086|-7.6325
Fes el-Bali|פס|פז,Fes,Fez|Morocco|34.0650|-4.9730
Merzouga Sahara|מרזוגה|סהרה,Sahara|Morocco|31.0990|-4.0121
Carthage|קרתגו||Tunisia|36.8528|10.3233
Sidi Bou Said|סידי בו סעיד||Tunisia|36.8714|10.3414
Lalibela|לליבלה||Ethiopia|12.0314|39.0475
Okavango Delta|דלתת אוקוואנגו||Botswana|-19.2833|22.9000
Sossusvlei|סוסוסוולי||Namibia|-24.7275|15.2915
Etosha National Park|אטושה|Etosha|Namibia|-18.8556|16.3294
Sydney Opera House|בית האופרה של סידני|אופרה סידני,סידני,Sydney|Australia|-33.8568|151.2153
Sydney Harbour Bridge|גשר הנמל של סידני||Australia|-33.8523|151.2108
Bondi Beach|חוף בונדי|בונדי|Australia|-33.8908|151.2743
Uluru|אולורו|Ayers Rock|Australia|-25.3444|131.0369
Great Barrier Reef|שונית המחסום הגדולה||Australia|-18.2871|147.6992
Twelve Apostles|שנים עשר השליחים||Australia|-38.6624|143.1048
Flinders Street Station|תחנת פלינדרס|מלבורן,Melbourne|Australia|-37.8183|144.9671
Warner Bros Movie World|וורנר ברוס מוביל וורלד|Movie World|Australia|-27.9087|153.3109
Dreamworld Gold Coast|דרימוורלד|גולד קוסט,Gold Coast|Australia|-27.8640|153.3140
MONA Hobart|מונה|הובארט,Hobart|Australia|-42.8126|147.2528
Milford Sound|מילפורד סאונד||New Zealand|-44.6414|167.8974
Hobbiton Movie Set|הובייטון|שר הטבעות,Hobbiton|New Zealand|-37.8721|175.6833
Queenstown|קווינסטאון||New Zealand|-45.0312|168.6626
Sky Tower Auckland|סקיי טאוור|אוקלנד,Auckland|New Zealand|-36.8485|174.7622
`;
let IDX=null;
function norm(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[̀-֑ͯ-ׇ]/g,"").replace(/[׳״'’`"״]/g,"").replace(/[^a-z0-9֐-׿]+/g," ").trim()}
function build(){
  IDX=[];
  DATA.split("\n").forEach(ln=>{const f=ln.split("|");if(f.length<6)return;
    const names=[f[0],f[1]].concat((f[2]||"").split(",")).map(norm).filter(Boolean);
    IDX.push({en:f[0],he:f[1],c:f[3],lat:+f[4],lon:+f[5],v:names,t:names.map(n=>n.split(" "))})});
}
// קידומות בעברית (ה, ב, ל, מ, ו, ש) – מנסים גם עם וגם בלי
function stripHe(t){return /^[א-ת]{4,}$/.test(t)&&"הבלמוש".indexOf(t[0])>=0?t.slice(1):t}
function lev1(a,b){if(a==b)return true;if(Math.abs(a.length-b.length)>1)return false;let i=0;while(i<a.length&&i<b.length&&a[i]==b[i])i++;if(a.length==b.length)return a.slice(i+1)==b.slice(i+1);return a.length>b.length?a.slice(i+1)==b.slice(i):b.slice(i+1)==a.slice(i)}
function tokHit(q,t){return q==t||(q.length>=3&&t.indexOf(q)==0)||(q.length>=3&&t.length>=3&&q.indexOf(t)==0&&q.length-t.length<=2)||(q.length>=5&&t.length>=5&&lev1(q,t))}
function scoreV(qs,qt,v,t){
  if(qs==v)return 100;
  if(qt.every(x=>t.some(y=>x==y||stripHe(x)==y||x==stripHe(y))))return qt.length>=2?84:70;
  if(qs.length>=4&&(v.indexOf(qs+" ")==0||qs.indexOf(v+" ")==0))return 75;
  if(t.length>=2&&t.every(y=>qt.some(x=>x==y||stripHe(x)==y||x==stripHe(y)))&&v.length>=7)return 80;
  if(qt.length&&qt.every(x=>t.some(y=>tokHit(x,y)||tokHit(stripHe(x),y))))return qt.length>=2?66:56;
  return 0}
/* placeSearch(q, n, country) → [{en,he,c,lat,lon,score}] מהטוב לרע; country (אופציונלי) מקדם מקומות באותה מדינה */
function placeSearch(q,n,country){
  if(!IDX)build();
  const qs=norm(q);if(qs.length<2)return[];
  const qt=qs.split(" ").filter(x=>x.length>0);
  const cc=norm(country||""),out=[];
  IDX.forEach(e=>{let best=0;for(let i=0;i<e.v.length;i++){const s=scoreV(qs,qt,e.v[i],e.t[i]);if(s>best)best=s}
    if(best){const bonus=cc&&norm(e.c)==cc?5:0;out.push({en:e.en,he:e.he,c:e.c,lat:e.lat,lon:e.lon,score:best,rank:best+bonus})}});
  out.sort((a,b)=>b.rank-a.rank||a.en.length-b.en.length);
  return out.slice(0,n||5)}
window.placeSearch=placeSearch;
window.PLACES_COUNT=function(){if(!IDX)build();return IDX.length};
window.PLACES_ALL=function(){if(!IDX)build();return IDX.map(e=>({en:e.en,he:e.he,c:e.c,lat:e.lat,lon:e.lon}))};
})();
