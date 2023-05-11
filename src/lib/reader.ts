import axios from "axios";

export class XsdReader {
  readFromUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      axios
        .get(url, {
          headers: {
            "Content-Type": "application/xml",
          },
        })
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => reject(err));
    });
  }
}
