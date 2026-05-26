
async function test() {
  const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language_id: 71, source_code: 'print("hello")' })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
