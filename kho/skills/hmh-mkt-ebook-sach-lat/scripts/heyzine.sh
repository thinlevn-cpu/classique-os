#!/usr/bin/env bash
# heyzine.sh — Biến 1 PDF công khai thành SÁCH LẬT (flipbook) qua Heyzine API.
# Dùng:  bash heyzine.sh "https://classique.vn/wp-content/uploads/2026/06/ten.pdf"
# Yêu cầu: file .env có HEYZINE_API_KEY (Bearer) + HEYZINE_CLIENT_ID (k).
#
# GOTCHA quan trọng (đã kiểm chứng 2026-06-20):
#   - Endpoint api1/rest CHỈ nhận form-urlencoded; gửi JSON -> 422 "pdf required".
#   - Auth: Bearer = HEYZINE_API_KEY (đầy đủ secret.clientid) + tham số  k = HEYZINE_CLIENT_ID.
#   - CHỈ truyền pdf + k. Thêm title/t/author -> lỗi 500 "Input data error".
#   - PDF phải ở URL CÔNG KHAI, không redirect, đuôi .pdf (Heyzine tự fetch). Lark file URL KHÔNG dùng được.

set -euo pipefail
PDF_URL="${1:?Thiếu URL PDF công khai}"
ENV_FILE="${HEYZINE_ENV:-.env}"
# shellcheck disable=SC1090
source "$ENV_FILE"

RESP=$(curl -s -X POST "https://heyzine.com/api1/rest" \
  -H "Authorization: Bearer ${HEYZINE_API_KEY}" \
  --data-urlencode "pdf=${PDF_URL}" \
  --data-urlencode "k=${HEYZINE_CLIENT_ID}")

echo "$RESP"
FLIP=$(echo "$RESP" | grep -oE '"url":"[^"]+"' | head -1 | sed 's/"url":"//;s/"$//;s#\\/#/#g')
if [ -n "$FLIP" ]; then echo; echo "SÁCH LẬT: $FLIP"; else echo; echo "LỖI: xem response trên (kiểm tra key / URL công khai / chỉ pdf+k)."; exit 1; fi
