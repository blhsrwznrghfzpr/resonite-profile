// タグ画像マッピング設定
const tagImages: Record<string, string> = {
  // 一般的なタグ
  mentor: 'b765be132f8ddce120665b531ce8874fd2034529103ca72b0de9dfa896dfc9fc',
  moderator: '43b2368b3779c9413d24ba77ec9a9e00fce4d16e021e386941cde3247bdd1aa5',
  translator:
    '76152d6d2f7e125620ae7138c66a8d0408ebed45580bea727c6a673b325f2311',
  potato: 'adf9ba7eee98dfa36e8fcf4130f2d6e60d353566c9f315c0f28a000dd06cad2c',
  'durian tester':
    '1c62e8c224af005c9293bc636dd3e93e8f6d2aba202287cf40cbcfe1259129d4',
  mute: '89dcd8ab20fe52f799309e01b4a64a4f055bb864dd68ae52bce4382c0d1ea3b7',

  // MMC 汎用
  'mmc participant':
    'a92e7d4fe39d70c5b60c7aacdd7ebaae9708f9bff7f7b3580166594361d9987d',
  'mmc avatar 1st':
    '1e8d3ae6d159785d101396c2a7528d217af9b32a0d1023a9dd9c295269989138',
  'mmc other 2nd':
    '35514974f19846c0c4fb9ad1d0313dc9110a0cf1546da6d4cf0e8c8a8b699bfc',

  // MMC21
  'mmc21 participant':
    '167ad55acbebbbcd0b89a616f426bc59bdd73e3afe59c524a51722fde9fef597',
  'mmc21 avatar:misc 1st':
    '4b7e7417c0f183439ea4220391bf7278ea85942cacd3b4d80304e0bc765231b9',
  'mmc21 avatar:accessories 1st':
    '4b7e7417c0f183439ea4220391bf7278ea85942cacd3b4d80304e0bc765231b9',
  'mmc21 world:game 2nd':
    '25beea8017852677cc0e5ea9449501b1f36d4cf0e085238a6cfc17178535c693',
  'mmc21 world:game 3rd':
    'ad8c4e15698f3314e1de873793d8dcecd4a4eb24cb15d329c9075a1a9de1b8b8',
  'mmc21 other:misc 3rd':
    'd9a6cccecdaaf19346936dffd5ebb5aabd98b636334f9470e10582a6d1c50bb8',
  'mmc21 avatar:avatars 3rd':
    '562b055984508ea11eda9472620c544a4fedf80330bb8c0b234504597e96da76',
  'mmc21 meme 3rd':
    '1d3743ff2c9ef6c2722b1de819aee5b516dbe0bd0ef9ba536985d8f081753cef',
  'mmc21 world:misc 1st':
    'afbb7d44fdb65d285a5217ba7faaa73638db5acb6db7ab9e06e82bcdabd55859',

  // MMC22
  'mmc22 participant':
    'ebd3c882ec12805b293199f0c5e0d77c7333b524b205f668b65d80aa51c944c8',
  'mmc22 avatar':
    '8ee814db1f0107b127a02f8c22536cd6d0dfb767b88ad6295f392e54d49dce21',
  'mmc22 avatar:misc':
    '8ee814db1f0107b127a02f8c22536cd6d0dfb767b88ad6295f392e54d49dce21',
  'mmc22 avatar:accessories':
    '8ee814db1f0107b127a02f8c22536cd6d0dfb767b88ad6295f392e54d49dce21',
  'mmc22 honorable mention':
    'c5cbb3d6b9ed17539c5ba146d5ec30cfeb5d1ff0423738667b0e6991c8eddd08',
  'mmc22 honorable_mention':
    'c5cbb3d6b9ed17539c5ba146d5ec30cfeb5d1ff0423738667b0e6991c8eddd08',
  'mmc22 esd':
    'aa0566eb57bbc9192afbcdeec6c6458102223c4ec1c8a858ae1a65040c910a1d',
  'mmc22 world':
    'f9a58d294185c215b0bbd3b2469927098b02179ec333f4d9802b79d96f321303',

  // MMC23
  'mmc23 participant':
    '89c544d236ae061dc58e246dd600f0cad5ef4d492393fb65f69c2c9f7e9a2fbe',
  'mmc23 gifty':
    '1f0b7d8dfff68b8df0e2536103ca54318eac4f822b1e8811ee477c57afc3c010',
  'mmc23 honorable mention':
    '82657b927af6ff7cb944d83d19d8e8eff72574642735378fe39dd3b1cf38515f',
  'mmc23 avatar':
    '918da42cd1da0fe4662aae428da2cb3c65f154ae23194fee450d8697a157529a',
  'mmc23 world':
    'c8ba2e7f8eb8e017fd74ac9ac2f8a3f0cfe3c39bcd4e038fb7ef74200c40bf2e',
  'mmc23 world:game':
    'c8ba2e7f8eb8e017fd74ac9ac2f8a3f0cfe3c39bcd4e038fb7ef74200c40bf2e',
  'mmc23 other':
    '5452873da954c2e76f153ecb4a7122855ec6c63c63e8a92a5a3bc684ae4aa053',
  'mmc23 other:tau':
    '5452873da954c2e76f153ecb4a7122855ec6c63c63e8a92a5a3bc684ae4aa053',
  'mmc23 art':
    'c21dee140cec42742c0b7c5c0adbad42973850a04dc33f20468b6b2e0da60e1c',

  // MMC24
  'mmc24 participant':
    '00dd00f8b8c4d62f27934acb20ea8c2ea852d2f75fcfe16de0ce8b2643cfa6de',
  'mmc24 gifty':
    '8c68241754813bf4b41ad5db0b38e94a5ca524964caba4a888d69745ddc1689f',
  'mmc24 honorable mention':
    '2e919e40ca369653c8b35bd4609d506d2d9cbd73401e0cc9d0b7c895e533bb3e',
  'mmc24 avatar':
    '75ec4f48e39fe6534cda057f902f001a1418c3236b70c549d024b932e521f7bd',
  'mmc24 world':
    '9d56330c331f653f8b6f6503d5e2d9bf7ff62f548d968323b66076fe7e99b87f',
  'mmc24 art':
    '276dfbd2513263e54281f32831196b93b4ac7d4a1837e419261f6b589c6e098a',

  // MMC25
  'mmc25 participant':
    'd18570e373b1b2ad96a0be5bd0e3b38632f40df61fa82e5ff6bb9fd534c0e98e',
  'mmc25 gifty':
    '6581e85267c27bc010d3362c2fc495c5466d204a93a45ec55a40132dc7b2ae3b',
  'mmc25 honorable mention':
    'a8a29408b5453c22c0263d76020a49b3305511d469731e5ca51178b7ddff5acb',
  'mmc25 avatar':
    'd1378a2226714bdb0b6bdfdcb90eea905019e78b1f54b34ce4585cba08eff1ac',
  'mmc25 other':
    '48128da7c22307323877a022e7f18f529d51b040fadb625b5a555738e89d7b2d',
  'mmc25 volunteer bun':
    '18ae0d86ba36ea493b7511d87b28f9440502c2882ed6cc3bca3b8ee7a79c0ed3',
  'mmc25 meme':
    '813773c8c26c936f804db06e19cc1b36273ee73c1658df6e0c7c3e771d7fd8b6',

  // MMC26
  'mmc26 gifty':
    'b0d378d7e4fb9b46190cdb198fd770623929723827c705c66e84cda1f32a4882',

  // Neos Festa
  'neos festa 3':
    '8f329d39f0f6c4778afe7dd1f2c85461cfd0c57a79ebdbe648cfb5de797261b1',
  'neos festa 3 participant':
    'db19e650645cc15516a4e95f02253e3aefd7bd2a9ffeb838d95a08d9eb4334f1',
  'neos festa 4 participant':
    'b3e14476da9ee56a2bfd618e3281b7314999797ba654eabb0588852ee1ef04aa',
  'neos festa 4 ambassador':
    '23f645e2084a43d7c96fb1fd7cb9f732faa66baa703ac128f3796c974e3f5bb8',

  // その他のイベント
  vblfc: 'a3a9380f5e4b97b686dbc64e30fd7eae6ff325eb00eba785c1646df5d451431f',
  vfe22: 'd9654f19b527972427b4793fdfbad8abb680a1f159dd2e80ce1b35cf27590237',
  'unifesta 2023':
    'fa88adba5c5c3910052ec801852ed56138ac606b45e66a5f4f51a02af032166e',
  'vket24 participant':
    'c5c2029730efdf65b1eeed61dcc40103b16d10c2c42b76226593dd77b8dd193e',
  'unifesta 2024 participant':
    '0a2665175e528c1887bff6b63c2729a64cdf37a7ffedef2784feba41af1999be',
  'unifesta 2024 ambassador':
    'b50d3e85bee612408dd17afc58a2b99f3785599984dc796bbf82d35889eca483',
  'halloween24 participant':
    'f31448d1140a687cbc7917e0a169ebcd2d7ea477f6bbc8853f576c9e43053d5a',
  'halloween24 winner':
    'ea3e4281b20e3250bb58d6e26505c6272d006714c4c78945367f146a97851a9c',
  jmof25: '057beb177e1519bb6cd0cf37e961117b9739e966ee5ab5b4b9415aa33eb71660',
  'halloween25 participant':
    'f053c200862d16025f46ae9e4fcf7d42334f206e12adb032f34bcbf7fb1e1b61',

  // Pride Flag
  'pride aegosexual':
    '769485d31a479c68498c5eca7da554b77da5a112732929deef8096301fe346f6',
  'pride agender':
    '1f64ab9f3ffaf43723d444e2853ddd6658d7ae54f2ecb8b15b2614acc07e8982',
  'pride aroace':
    '570faae678b96aa12997cdc0a9e3de2206443eaf974e56fc01732bc67b7f3909',
  'pride aromantic':
    '26f95d03589d9ec8beafacc8311785b63f384c80957e70e6cc782e4b74db96b4',
  'pride asexual':
    '09f8dfbd96c5c1cfef77e8d9ce61974d1f3d32c7e177eb8140dbffd975799514',
  'pride bigender':
    '0002cd99d9dfcd5556ce47c9bda094cb6a6edd3e43d73af37d3a945c5105525f',
  'pride bisexual':
    'ad2a21831fddb84643b7d90701fd0cc23303de4ef4c3d95d2023b5eec0f7c4d6',
  'pride demigender':
    'b4408c7294f6220c6965680e6d5093da5b7c0219ebf5d83340432e1c91460738',
  'pride demisexual':
    '5417465fc18d45602bcadf7ac054f967624bdd4eb149f488387dcb5a21e845cb',
  'pride genderfluid':
    'c6072ca4c890419d899cbf8270cc5ab0bb1bef4b6728652d072298a252e3e486',
  'pride genderqueer':
    '0933e6ab6cbab751cbbc3718eb7d8e8a56ff3ba17130b482d32be0e095d1dd65',
  'pride gilbertbaker':
    'bc64016a8e11fac2d2b406f9bc5b9a0286ca6e2d26390cc51e342a38cb6b8548',
  'pride graysexual':
    'dc3b38d5aa52fb14b1e27e8d663d0634272616bf476c14cf216752e12fecfa10',
  'pride intersexprogress':
    '6217e44581cdf6f57e4bf44e1e478f85c954abb2d9169db564a84f2ea6feece6',
  'pride intersex':
    'cf6c42b4809ce54b0f3df08545c787a36bd5e397a6c4fa8248c05ad3a10253cf',
  'pride lesbian':
    '2e4ce52a0d1e0b58abc8740e2ee9a4e92464c4174fc3e8be49d7c6546fae9e2a',
  'pride nonbinary':
    'e44228f69b7e122b98143435885fee6c53627e87b93bc63d053c8ee6006e4c33',
  'pride pansexual':
    '7e94e18d72cc9fe45060e3d39a301bd284c59543abe9a515bd4e9de20d9c9d03',
  'pride philadelphia':
    'c35c01aa97a09c0445e962d5c301cf50d35ce20a24914a43435918b0644601ab',
  'pride polyamory':
    'f7332e7d0af56e3a4ce1b97277bea05359beaf9efe0c8f56f49ef3b4cb58a006',
  'pride polysexual':
    '03e09d9ce7cfcf2d54d70fd7f860369691c42773f2dcaafa5bd33f0ade03e9e5',
  'pride progress':
    'da63efc61772186d0181d369b397b51fc4126ffecdfac3e6d07a657e9ff34edb',
  'pride queer':
    'f7410d263fa52dbe94763b8cd5a6e29dded37895dffdf83f420e7557cdc2cee0',
  'pride queerpeopleofcolor':
    '1602857489fca53a1ea7dd4349914184947e434f1143b4fbe8bf2aef0a9a3334',
  'pride straightally':
    '9013e041e2051e6f7494fb911f90f449e2dd3130a9307061383c201d2cde04a9',
  'pride traditional':
    'ca45c4955f17898bafb08b2ed97daf59a93c3d432be1684820ba02fceecc492f',
  'pride transinclusivegaymen':
    '4fc225ad2e049151827a88d5ea385bf2f67c881a7b7310c91ede94b8b43feb07',
  'pride transfeminine':
    '13dcfcd37ca50678c2a2760ccc7194dc9bae66046f4633367bb3c83472cecc2a',
  'pride transgender':
    '94eaec80c3726f6bed4f1b0dea4f01de2f359cb1ae47b12c317da229af43cee0',
  'pride transmasculine':
    '9675c4cce538300d7df6cbb340c4fd1d7db6bfd4bb861e8fb2e5e9aea800430c',
  'pride twospirit':
    '8a7de000cfaa3edaa78b3266c31e2e33aec37ba3f2c5eb7c89ab106becae46b8',
  // 追加のバッジ画像
  blueberry: 'b1eb93861c2ab23510f3c525c2bbc69be5371a1715e80cd1880e8c771ac8bbf1',
  'color blind':
    '1498ea5e6302e86ad4cf2d6f1626a9e8469d5a57410a42837da1f88a8aa80c40',
  'hearing impaired':
    'b079a1bc258fd2bf2e56eefd88a0a1af04c47fe3dfed090fedfe04da523cab42',
  'htc vive':
    'f92c0a3e31882b8075081dfa2d0f4d3403b89422ccebf75acaf6cb8947f51175',
  lbecompetition25:
    'eaf36b29d1c728a91ed8c22ec7735b2b9f42804c6d19699ac1cf054fd08b61e8',
  mango: '77cae650f07d32a36b31d1af896bc666eecbfdba5c37aecb869c982b2678ebda',
  'mmc avatar 2nd':
    'c387b7df5f5591b1ded321406e6348e1bcd371e87a14380b14c2c62039b77f5a',
  'mmc avatar 3rd':
    'd37d9bb54c3f3e32b76d5b9486af18ca06c7da32b38f9ac3b7530dd27befad93',
  'mmc cow': 'e50f19c45f2f1721cf592df72ebb09f1e5edfa57774aa42a6e33caa22a3ce618',
  'mmc lips':
    '12654a508df6a7898667ccc2ca70f935c40008ff2eb81ab8185508cca538d436',
  'mmc other 1st':
    'e5407b774a4d22555f1cfd02737432fdec36f43f383181ce01e6f4256ac05eab',
  'mmc other 3rd':
    '78ab203e527d4465375c245c2b314afae3e4690015d279a212cd5203cd509038',
  'mmc world 1st':
    '3a86cc9db93f2572000cdfa51854622f2174c02c098ab31ae4e735d6529c0688',
  'mmc world 2nd':
    '10b17975a8907cab6cafa9a0e35ebf72e0a770ba55e2a66fca375ef19e03c13a',
  'mmc world 3rd':
    '841fa2b451b4e43fe247914e3ea9352989d96ccd4cc58f2e916308dd3e196160',
  'mmc21 avatar:accessories 2nd':
    '43c5a5c4415a7611e27b1db103c557d37a42b8e045364149bb91a2f4958ea104',
  'mmc21 avatar:accessories 3rd':
    '562b055984508ea11eda9472620c544a4fedf80330bb8c0b234504597e96da76',
  'mmc21 avatar:avatars 1st':
    '4b7e7417c0f183439ea4220391bf7278ea85942cacd3b4d80304e0bc765231b9',
  'mmc21 avatar:avatars 2nd':
    '43c5a5c4415a7611e27b1db103c557d37a42b8e045364149bb91a2f4958ea104',
  'mmc21 avatar:misc 2nd':
    '43c5a5c4415a7611e27b1db103c557d37a42b8e045364149bb91a2f4958ea104',
  'mmc21 avatar:misc 3rd':
    '562b055984508ea11eda9472620c544a4fedf80330bb8c0b234504597e96da76',
  'mmc21 grill cheeze':
    '4c6c576636f21c267bd4f7335cde73f2245bf023ba24cedca4a228275880cbc3',
  'mmc21 meme 1st':
    '159a8de23d675caac96ea3ad4c1e0080742e85a302a22a334e895efd673acdb9',
  'mmc21 meme 2nd':
    'ce858c89d564a244d1d6aaf259f95efc54fc8bd40382b4501b2f64510cd11a63',
  'mmc21 mouth':
    '64bb3fd99a673e0545d2e5fab73b01a077c8ce3dcdb5d550ff2b692ad4961907',
  'mmc21 other:misc 1st':
    '4521163a0ee4cd6077072c69199a57e78d556af1fd78d22ae9415d9c02fea90c',
  'mmc21 other:misc 2nd':
    '7fc994c3252631023cfc98120424f59ae3c612b4c3eddb37a98a1fa03c0258c9',
  'mmc21 other:tau 1st':
    '4521163a0ee4cd6077072c69199a57e78d556af1fd78d22ae9415d9c02fea90c',
  'mmc21 other:tau 2nd':
    '7fc994c3252631023cfc98120424f59ae3c612b4c3eddb37a98a1fa03c0258c9',
  'mmc21 other:tau 3rd':
    'd9a6cccecdaaf19346936dffd5ebb5aabd98b636334f9470e10582a6d1c50bb8',
  'mmc21 smile':
    '3f0c8ab1ca45917cfb82ed1c97f15c17b785814a3b3a6d84d703c1719314b416',
  'mmc21 world:game 1st':
    'afbb7d44fdb65d285a5217ba7faaa73638db5acb6db7ab9e06e82bcdabd55859',
  'mmc21 world:misc 2nd':
    '25beea8017852677cc0e5ea9449501b1f36d4cf0e085238a6cfc17178535c693',
  'mmc21 world:misc 3rd':
    'ad8c4e15698f3314e1de873793d8dcecd4a4eb24cb15d329c9075a1a9de1b8b8',
  'mmc21 world:social 1st':
    'afbb7d44fdb65d285a5217ba7faaa73638db5acb6db7ab9e06e82bcdabd55859',
  'mmc21 world:social 2nd':
    '25beea8017852677cc0e5ea9449501b1f36d4cf0e085238a6cfc17178535c693',
  'mmc21 world:social 3rd':
    'ad8c4e15698f3314e1de873793d8dcecd4a4eb24cb15d329c9075a1a9de1b8b8',
  'mmc22 art':
    '71d987dd3a75b276d00a241008408c33d26537438960e94b3ac418e68dee6596',
  'mmc22 cheese coin':
    '3a398758b484cf8ac52bfb00b9bc3203b0398186f9dfefbb9f8ca7ff4bbfb3df',
  'mmc22 holywater':
    '6701c8ad48ae433442ec216ff498f8ef70a83df2a33017eed98f91a690aa35b3',
  'mmc22 litalita':
    'de9be78be80d169af4419aaaf849565a48bc49c24b631a3d15f1ffd4fa9cd1af',
  'mmc22 meme':
    '106b696ed2d4a61ef3a27594b3886c9393d1843787a23a33793852385e235401',
  'mmc22 other':
    '33e59769ce553b09bde7449158e1ebbcc908a3c9cb38561fdb21002a53ef3b21',
  'mmc23 esd':
    '811a6cbf322e6edcf917e1a12da995599315f4fe8f4a5dbbab1060d0517b4a1a',
  'mmc23 holywater':
    'fcf3b4bd1d39499d73fbb2184dbee892ea6013cb94519084ed8436b1f7eaac8e',
  'mmc23 litalita':
    '60d81b7b519fd3f4936fd87ba0221c9e9c670ed56df8602bf17de89d2236bb58',
  'mmc23 meme':
    '7de6cd4bd8fe6ff33f6e801b5b3bca9008d75aa8737e3e22ced6f85509ff6a6a',
  'mmc23 prime':
    '423234d2df83bb616408709bf2011b3ea2993d545ac5796bf37a8088d64111e3',
  'mmc24 esd':
    '971f05bf7c4786006e29105ce147f5e732c31114c6302fe7d5a3796f3c1e7ef8',
  'mmc24 froox':
    '04d4e03231a996ab20a6d13609c613c1e6c9986ad3c9e1aa56a6edf999c0d78a',
  'mmc24 holywater':
    'a4d53ce137d46dac48b6385f70c3942b64dfe93aee066ca2a6b0f39b6294cdbd',
  'mmc24 litalita':
    '065d23b0a83a0c7d6bef01e3c6d2250a7d1edeff702217e4b5763db87d04dee5',
  'mmc24 meme':
    '44af0cd63b676b616c98f7c3138698d01f1716b02e7d3bd63d4659924424cc6d',
  'mmc24 narrative':
    '2ee8668bf120f92b401115d1edee748b11f0b63bb28f05d494fafca24e7a0abd',
  'mmc24 other':
    'f1357514a7cd156c28ad921475db2b7ad5ab6c14d10c9ffcc4dac7af8b12b71c',
  'mmc24 prime':
    '9b8fbfe6ed35a5d71108ba910c4415df12936451be6dc9b4b550ae7802428704',
  'mmc25 art':
    '3bdb0fe90ebc3267faac506bb576c555d6181dbe1b95ad83b2eb6935fd3c4fd1',
  'mmc25 esd':
    'fea2d49992b8b3c242042c6f3e43e47575e229440963f6775ac75da85ecb1cd5',
  'mmc25 narrative':
    'cc2fbc74ca0e652a8327b4504ea447e9db4ae5b0e5bf01be01375809a86b898e',
  'mmc25 volunteer rib':
    '51eebc62615c5aceb1215a8d8b26fbd074c620d0f99cff1e2d96631ee52e24b6',
  'mmc25 world':
    '46f32e9ccf1e2a4274081aa16044fd393fd9393cd95598d9ae4b2192f0abfba5',
  'mmc26 art':
    '8336f8e1ee8e0b8f47a3ca4961c23f50bdea376f318002c4f8c08a37eaf8ac3d',
  'mmc26 avatar':
    '4e209e86e379b3ad71112a527243aedecf6cfb0e7933d29c1f8aa1b3b4479963',
  'mmc26 esd':
    '6b12a13db1379374228400eaaed0b253b706d7dac91cb22bbd65270819a66182',
  'mmc26 honorable mention':
    'ebdc94bd1eb96a52dfe545afac3a6ce36f4c4cc3f8c1bfdb2dfc4b2a6a360980',
  'mmc26 meme':
    '6b8ea4d4b30e44758641e8228bf656a6ccb7f24fe3b6ed9bd0f6f386e1118164',
  'mmc26 narrative':
    '84f6bd7702fd1656d7a0382e8251875b5d7024797939bcd91dc0ad0b2c1fb3b6',
  'mmc26 other':
    'df558b48f398c5e230f310ff730b944a061bb43d9f7a24883502e2fcbf4ce08e',
  'mmc26 participant':
    '7a2cf4e6ca309b95017a5d32c3690c30137737c7551d1a079ee8a926284cc2b5',
  'mmc26 volunteer but':
    '718c56eab1cc1ac4f694c60ddf2247d9f5ea0996b243e10c0ea7956e18f5df2e',
  'mmc26 world':
    '802bb815692529b5d9c7337c0118951f4f63aa8efdd65dc2195659953c7b6753',
  nasachallenge25:
    'a33a965c7e06072bdbc9eb6c61c83ca0a8a438d3493ff76067d7256ea6bc2526',
  orange: '54d578102c1b23cfd3d99aa7afeea5e8e3dfb20466ca8ae6ee29d6ef69d2f564',
  'pride abrosexual':
    '84f47e56928099171e741060f4ad1257cd2fa0fffeb633bc184cb527a916b849',
  'pride altersex':
    'fed2e4974f30680f96d5222094969f25cc29a097d5f7faf17d1fe30480ec58bb',
  'pride bearbrotherhood':
    '3abc011a32a4fd685cf58387371bae1253211ed8672799cb8cd5708cdc6560ea',
  'pride demiboy':
    '42dbc3843547ce845924b6d3d6facb9078450aca71e22a5d27776e63263db0d1',
  'pride demigirl':
    'e1cb7e9ae3ae013aec92962608f5977ca155cd14cac5c69f2433a15b5cc25d48',
  'pride disability':
    '0a79a288bc4c0abe3c916df08297716f2d892c5056e2858dffd8dcd24732d198',
  'pride femboy':
    '6e0923b93c1996ca2f518f16fd0622fdcd28ef85d684ceb9f62125e56c0d71c2',
  'pride relationshipanarchy':
    '85ed685971b8ecf3eebc3b8e5df06b45c45bb967c4638a8375f693af4bc4f41c',
  'pride sapphic':
    '8e1352a84c9e08eb2a0885800455fde9d2bae963140c6a6ccc6b35f1b56d8b4a',
  'pride tomboy':
    'b3cfa8c2a85eea1d4bbb5c05cafcf74506464531e2f20898cd29958cd75e05aa',
  'team member':
    'da11582c477cfd9afd957268c72961cca4130f64bea8440e381840425c898078',
  'unifesta 2026':
    'c50be45ec730de80723054dc0488eef6897e81a1c05363c11cc0c5c52689774e',
  'visually impaired':
    'b4e2da97dd3ccc2d49da3bb3adbb7f3fe575d133537dce5aea931e7a75c25926',
};

// タグアイコンを取得する関数
export function getTagIcon(tagName: string): string | null {
  // custom badge:xxxの特殊処理
  if (tagName.startsWith('custom badge:')) {
    const customBadgeId = tagName.replace('custom badge:', '');
    return `https://assets.resonite.com/${customBadgeId}`;
  }

  // 通常のタグ画像
  const imageValue = tagImages[tagName];
  if (!imageValue) return null;

  // 完全なURLかどうかを確認
  if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
    return imageValue;
  }

  // そうでなければassets.resonite.comのハッシュとして扱う
  return `https://assets.resonite.com/${imageValue}`;
}
