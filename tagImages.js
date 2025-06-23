// タグ画像マッピング設定
const tagImages = {
  // タグ名: 画像ID のマッピング
  "neos festa 3 participant":
    "db19e650645cc15516a4e95f02253e3aefd7bd2a9ffeb838d95a08d9eb4334f1",
  "mmc21 participant":
    "167ad55acbebbbcd0b89a616f426bc59bdd73e3afe59c524a51722fde9fef597",
  "mmc21 world:game 3rd":
    "ad8c4e15698f3314e1de873793d8dcecd4a4eb24cb15d329c9075a1a9de1b8b8",
  "mmc21 avatar:misc 1st":
    "4b7e7417c0f183439ea4220391bf7278ea85942cacd3b4d80304e0bc765231b9",
  "mmc22 participant":
    "ebd3c882ec12805b293199f0c5e0d77c7333b524b205f668b65d80aa51c944c8",
  "mmc22 avatar:misc":
    "8ee814db1f0107b127a02f8c22536cd6d0dfb767b88ad6295f392e54d49dce21",
  "mmc22 avatar":
    "8ee814db1f0107b127a02f8c22536cd6d0dfb767b88ad6295f392e54d49dce21",
  "neos festa 4 participant":
    "b3e14476da9ee56a2bfd618e3281b7314999797ba654eabb0588852ee1ef04aa",
  "mmc23 gifty":
    "1f0b7d8dfff68b8df0e2536103ca54318eac4f822b1e8811ee477c57afc3c010",
  "mmc23 participant":
    "89c544d236ae061dc58e246dd600f0cad5ef4d492393fb65f69c2c9f7e9a2fbe",
  "mmc23 honorable mention":
    "82657b927af6ff7cb944d83d19d8e8eff72574642735378fe39dd3b1cf38515f",
  mentor:
    "b765be132f8ddce120665b531ce8874fd2034529103ca72b0de9dfa896dfc9fc",
  "mmc24 gifty":
    "8c68241754813bf4b41ad5db0b38e94a5ca524964caba4a888d69745ddc1689f",
  "mmc24 participant":
    "00dd00f8b8c4d62f27934acb20ea8c2ea852d2f75fcfe16de0ce8b2643cfa6de",
  "unifesta 2023":
    "fa88adba5c5c3910052ec801852ed56138ac606b45e66a5f4f51a02af032166e",
  "vket24 participant":
    "c5c2029730efdf65b1eeed61dcc40103b16d10c2c42b76226593dd77b8dd193e",
  "unifesta 2024 participant":
    "0a2665175e528c1887bff6b63c2729a64cdf37a7ffedef2784feba41af1999be",
  "mmc25 gifty":
    "6581e85267c27bc010d3362c2fc495c5466d204a93a45ec55a40132dc7b2ae3b",
  "mmc25 participant":
    "d18570e373b1b2ad96a0be5bd0e3b38632f40df61fa82e5ff6bb9fd534c0e98e",
  "mmc25 honorable mention":
    "a8a29408b5453c22c0263d76020a49b3305511d469731e5ca51178b7ddff5acb",
  "mmc participant":
    "a92e7d4fe39d70c5b60c7aacdd7ebaae9708f9bff7f7b3580166594361d9987d",
  "neos festa 4 ambassador":
    "23f645e2084a43d7c96fb1fd7cb9f732faa66baa703ac128f3796c974e3f5bb8",
  "mmc23 other":
    "5452873da954c2e76f153ecb4a7122855ec6c63c63e8a92a5a3bc684ae4aa053",
  "mmc23 world":
    "c8ba2e7f8eb8e017fd74ac9ac2f8a3f0cfe3c39bcd4e038fb7ef74200c40bf2e",
  "mmc24 honorable mention":
    "2e919e40ca369653c8b35bd4609d506d2d9cbd73401e0cc9d0b7c895e533bb3e",
  translator:
    "76152d6d2f7e125620ae7138c66a8d0408ebed45580bea727c6a673b325f2311",
  "halloween24 participant":
    "f31448d1140a687cbc7917e0a169ebcd2d7ea477f6bbc8853f576c9e43053d5a",
  "mmc24 avatar":
    "75ec4f48e39fe6534cda057f902f001a1418c3236b70c549d024b932e521f7bd",
  "mmc25 other":
    "48128da7c22307323877a022e7f18f529d51b040fadb625b5a555738e89d7b2d",
  potato:
    "9e2df387f7ab288486d5abd8ebb760d87872227a47779c897593c263f27b1f8e",
  "mmc24 art":
    "276dfbd2513263e54281f32831196b93b4ac7d4a1837e419261f6b589c6e098a",
  "mmc24 world":
    "9d56330c331f653f8b6f6503d5e2d9bf7ff62f548d968323b66076fe7e99b87f",
  "halloween24 winner":
    "ea3e4281b20e3250bb58d6e26505c6272d006714c4c78945367f146a97851a9c",
  "unifesta 2024 ambassador":
    "b50d3e85bee612408dd17afc58a2b99f3785599984dc796bbf82d35889eca483",
  "mmc21 avatar:accessories 1st":
    "4b7e7417c0f183439ea4220391bf7278ea85942cacd3b4d80304e0bc765231b9",
  "mmc21 other:misc 3rd":
    "d9a6cccecdaaf19346936dffd5ebb5aabd98b636334f9470e10582a6d1c50bb8",
  vfe22:
    "d9654f19b527972427b4793fdfbad8abb680a1f159dd2e80ce1b35cf27590237",
  "mmc22 honorable_mention":
    "c5cbb3d6b9ed17539c5ba146d5ec30cfeb5d1ff0423738667b0e6991c8eddd08",
  "mmc22 honorable mention":
    "c5cbb3d6b9ed17539c5ba146d5ec30cfeb5d1ff0423738667b0e6991c8eddd08",
  "mmc22 avatar:accessories":
    "8ee814db1f0107b127a02f8c22536cd6d0dfb767b88ad6295f392e54d49dce21",
};

// タグアイコンを取得する関数
function getTagIcon(tagName) {
  // custom badge:xxxの特殊処理
  if (tagName.startsWith("custom badge:")) {
    const customBadgeId = tagName.replace("custom badge:", "");
    return `https://assets.resonite.com/${customBadgeId}`;
  }

  // 通常のタグ画像
  const imageId = tagImages[tagName];
  return imageId ? `https://assets.resonite.com/${imageId}` : null;
}