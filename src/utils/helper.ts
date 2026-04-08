export const formatDateID = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  
  export const getTodayDate = () => new Date().toISOString().split("T")[0];