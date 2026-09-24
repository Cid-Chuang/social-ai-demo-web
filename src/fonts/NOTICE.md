# 字型授權聲明

本目錄下的 `taipei-sans-tc-regular.woff2` 與 `taipei-sans-tc-bold.woff2`
是**台北黑體（Taipei Sans TC Beta 1.000）**的子集，依 SIL Open Font License 1.1
散布，授權全文見同目錄的 `OFL.txt`。

## 來源

- 字型作者：JT Foundry <https://sites.google.com/view/jtfoundry/zh-tw>
- 上游基礎：Source Han Sans（思源黑體），由 JT Foundry 說明
- 取得管道：`@fontpkg/taipei-sans-tc-beta@1.0.0`（jsdelivr CDN），
  sha256 與 `vp-tw/taipei-sans-tc` 記載的原始檔逐位元相同

原始檔 sha256：

```
8cc967e1e428c552701c461e8169e6ae76c7a23694ea1a6a786d6746adec53c4  TaipeiSansTCBeta-Regular.ttf
5249d3bdda9c9f4c62840e804b4d2530b7f4dfab6d68fb508c120b0e7e600419  TaipeiSansTCBeta-Bold.ttf
```

## 字型內嵌的授權宣告（逐字引用）

name ID 0（著作權）：

> Taipei Sans TC is a modified font of Source Han Sans.

name ID 13（授權）：

> This Font Software is licensed under the SIL Open Font License, Version 1.1.
> This Font Software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
> CONDITIONS OF ANY KIND, either express or implied. See the SIL Open Font
> License for the specific language, permissions and limitations governing your
> use of this Font Software.

name ID 14（授權網址）：<http://scripts.sil.org/OFL>

## 關於修改與命名

本專案對字型做的唯一修改是**取用子集**（保留 Big5 一級常用字，移除其餘字符），
未變更任何字符外形。

字型的 name table 未宣告 Reserved Font Name，其上游 Source Han Sans 亦為無 RFN 的
OFL 字型，因此子集沿用「Taipei Sans TC」名稱符合授權條款。子集的產生方式見
`../../scripts/build-fonts.py`。
