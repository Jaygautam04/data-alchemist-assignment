import Head from "next/head";
import FileUpload from "@/components/FileUpload";

export default function Home() {
  return (
    <>
      <Head>
        <title>Data Alchemist</title>
      </Head>
      <div className="min-h-screen bg-gray-100 p-10">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          🧪 Data Alchemist – Upload CSV
        </h1>
        <FileUpload />
      </div>
    </>
  );
}
