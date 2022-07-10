import axios from "axios";
const cheerio = require("cheerio");

class Scraper {
  //props
  public query: string;
  public category: string;
  public page: number;
  public url: string;
  public options: object;
  public links: string[];
  public last_page: number;
  public html: string;

  //constructor
  constructor(query: string, category?: string, page: number = 1) {
    this.query = Scraper.CleanQuery(query);
    this.category = category;
    this.page = page;
    this.url = `https://www.subito.it/annunci-italia/vendita/${this.category}/?q=${this.query}&o=${this.page}`;
  }

  public MakeUrl(): string {
    return `https://www.subito.it/annunci-italia/vendita/${this.category}/?q=${this.query}`;
  }
  //clean input query
  public static CleanQuery(query: string): string {
    //trim starting/ending spaces
    query = query.trim();

    //replace empty spaces with + for query search
    query = query.split(" ").join("+");

    return query;
  }

  //create options inline json
  public static CreateJsonOption(): string {
    var arr_cat = [];

    for (let item in ECategory) {
      let cat_text = item;
      let cat_data = ECategory[item];
      let cat_inline = [
        {
          text: cat_text,
          callback_data: cat_data,
          command: "categories",
        },
      ];

      arr_cat.push(cat_inline);
    }

    return JSON.stringify(arr_cat);
  }

  //create user options
  public CreateOptionsCategory(): void {
    this.options = {
      reply_markup: JSON.stringify({
        inline_keyboard: JSON.parse(Scraper.CreateJsonOption()),
      }),
    };
  }

  public ExtractLink(html: string): string[] {
    let links = [];
    const $ = cheerio.load(html);
    $(".items__item", html).each(function () {
      let link = $(this).children("a").attr("href");
      if (link) {
        links.push(link);
      }
    });
    return links;
  }

  public static GetLastPage(html: string): number {
    const $ = cheerio.load(html);
    let last_page = $(".unselected-page", html)
      .last()
      .children("a")
      .attr("href");
    last_page = last_page.split("&o=")[1];
    return parseInt(last_page);
  }

  public SetLastPage(html: string): void {
    const $ = cheerio.load(html);
    let last_page = $(".unselected-page", html)
      .last()
      .children("a")
      .attr("href");
    last_page = last_page.split("&o=")[1];
    this.last_page = parseInt(last_page);
  }

  public async FetchHtml(): Promise<string> {
    let html = await axios.get(this.url);
    return html.data;
  }

  public static CreatePagesArray(last_page: number): number[] {
    let pages: number[] = [];
    for (let index = last_page; index > 0; index--) {
      pages.push(index);
    }
    pages.sort((a, b) => a - b);
    return pages;
  }

  public static CreateJsonPages(
    last_page: number,
    page_current: number
  ): string {
    let pages: number[] = this.CreatePagesArray(last_page);
    var arr_pages = [];

    let pag_inline = [
      {
        text: page_current++ + 1,
        prev_page: page_current - 1,
        callback_data: page_current,
        command: "pages",
      },
    ];

    arr_pages.push(pag_inline);
    return JSON.stringify(arr_pages);
  }
}

enum ECategory {
  Auto = "auto",
  AccessoriAuto = "accessori-auto",
  MotoScooter = "moto-e-scooter",
  AccessoriMoto = "accessori-moto",

  Elettronica = "elettronica",
  CasaPersona = "casa-e-persona",
  SportHobby = "sport-e-hobby",
}

export default Scraper;
