export async function getCategories() {
    const res = await fetch("https://wiki-hydyar.onrender.com/api/categories");
    const json = await res.json();
    return json.data || [];
  const data = await getCategories();
console.log(data);
}