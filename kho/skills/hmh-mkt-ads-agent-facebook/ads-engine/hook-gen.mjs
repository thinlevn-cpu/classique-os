#!/usr/bin/env node
// hook-gen.mjs — Sub-agent CONTENT: sinh N bài quảng cáo, mỗi bài 1 HOOK theo công thức.
// Grounded từ nguyên lý hook (skill hmh-mkt-hook-video / chan-dung-dau-suong): câu hỏi đau,
// phản bác niềm tin, hứa kết quả, tò mò, cảnh báo sai lầm, đồng cảm, con số, FOMO.
// node hook-gen.mjs --product "X3 Hiệu suất" --chudich "làm marketing hiệu quả" --n 3 --cta "Để lại thông tin nhận tư vấn"

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const P = arg("product", "khóa học"), C = arg("chudich", "phát triển kinh doanh"), CTA = arg("cta", "Để lại thông tin để được tư vấn."), N = parseInt(arg("n", "3"), 10);

const FORMULAS = [
  { goc: "Nỗi đau", hook: `Anh chị đang ${C} mà kết quả vẫn nhỏ giọt?`, body: `Vấn đề thường không phải do chưa cố gắng, mà do chưa có một hệ thống đúng. ${P} giúp anh chị gỡ đúng điểm nghẽn.` },
  { goc: "Phản bác từ chối", hook: `Nhiều người nghĩ muốn ${C} thì phải giỏi công nghệ hoặc ngân sách lớn.`, body: `Thật ra không cần. Chỉ cần một cách làm đúng, đi từng bước cùng ${P}.` },
  { goc: "Khát khao / Kết quả", hook: `Hình dung ${C} mang về gấp ba kết quả so với bây giờ.`, body: `Không nhờ may mắn, mà nhờ một quy trình rõ ràng. Đó là điều ${P} làm được.` },
  { goc: "Tò mò", hook: `Có một cách ${C} mà rất ít người làm đúng.`, body: `${P} sẽ chỉ anh chị từng bước, áp dụng được ngay cả khi bận trăm việc.` },
  { goc: "Cảnh báo", hook: `Đừng tiếp tục ${C} theo cách cũ nếu chưa biết 3 sai lầm khiến tiền đổ sông.`, body: `${P} giúp anh chị tránh đúng những cái bẫy đó.` },
  { goc: "Đồng cảm", hook: `Nếu anh chị từng thấy mệt vì ${C} mãi không tới đâu, anh chị không một mình.`, body: `${P} là một lối đi rõ ràng và nhẹ nhàng hơn.` },
  { goc: "Con số", hook: `Hàng nghìn người đã ${C} hiệu quả hơn nhờ ${P}.`, body: `Anh chị hoàn toàn có thể làm được điều tương tự.` },
  { goc: "FOMO", hook: `Ưu đãi ${P} cho người ${C} sắp đóng.`, body: `Đăng ký sớm để nhận trọn lộ trình và buổi tư vấn miễn phí.` },
];

const out = [];
for (let i = 0; i < N; i++) {
  const f = FORMULAS[i % FORMULAS.length];
  out.push({ goc: f.goc, hook: f.hook, caption: `${f.hook} ${f.body} ${CTA}` });
}
console.log(JSON.stringify(out, null, 2));
