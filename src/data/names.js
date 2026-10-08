// Fictional, region-flavored name pools. Squads are generated from these with a
// seeded RNG so every team always gets the same players. No real player names.

export const NAME_POOLS = {
  hispanic: {
    first: ['Alejo', 'Bruno', 'Ciro', 'Dario', 'Elian', 'Fermin', 'Gael', 'Hugo', 'Iker', 'Joaquin', 'Lisandro', 'Mateo', 'Nahuel', 'Oriol', 'Pablo', 'Ramiro', 'Santi', 'Tobias', 'Unai', 'Valentin', 'Xavi', 'Yago', 'Adrian', 'Benicio'],
    last: ['Arriaga', 'Benitez', 'Cabral', 'Duarte', 'Escobedo', 'Fuentes', 'Galvan', 'Herrera', 'Ibarra', 'Jaramillo', 'Lozano', 'Medina', 'Navarro', 'Olmedo', 'Peralta', 'Quintero', 'Robles', 'Salcedo', 'Toledo', 'Urrutia', 'Vidal', 'Zamora', 'Acosta', 'Barrios'],
  },
  lusophone: {
    first: ['Abel', 'Caio', 'Davi', 'Edson', 'Felipe', 'Gil', 'Heitor', 'Igor', 'Joao', 'Leandro', 'Murilo', 'Nuno', 'Otavio', 'Paulo', 'Rui', 'Tiago', 'Vitor', 'Wesley', 'Anderson', 'Breno', 'Danilo', 'Erick', 'Fabio', 'Gustavo'],
    last: ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Faria', 'Gomes', 'Lacerda', 'Macedo', 'Nogueira', 'Oliveira', 'Pacheco', 'Queiroz', 'Rocha', 'Sampaio', 'Teixeira', 'Valente', 'Brandao', 'Coelho', 'Freitas', 'Moura', 'Pinheiro', 'Tavares', 'Viana'],
  },
  english: {
    first: ['Alfie', 'Ben', 'Callum', 'Dean', 'Ethan', 'Finn', 'George', 'Harvey', 'Isaac', 'Jack', 'Kyle', 'Liam', 'Mason', 'Noah', 'Owen', 'Reece', 'Sam', 'Tyler', 'Wes', 'Jamie', 'Connor', 'Lewis', 'Archie', 'Rory'],
    last: ['Ashby', 'Brooks', 'Carver', 'Dawson', 'Ellison', 'Fletcher', 'Garner', 'Hollis', 'Irving', 'Jessop', 'Kendall', 'Lowe', 'Marsh', 'Norris', 'Osborne', 'Pryce', 'Radley', 'Shaw', 'Thorne', 'Upton', 'Vance', 'Whitlock', 'Yardley', 'Holt'],
  },
  french: {
    first: ['Adrien', 'Bastien', 'Clement', 'Damien', 'Enzo', 'Florian', 'Gaetan', 'Hugo', 'Jules', 'Killian', 'Lucas', 'Mathis', 'Nolan', 'Olivier', 'Pierre', 'Quentin', 'Remi', 'Theo', 'Yanis', 'Axel', 'Loic', 'Maxime', 'Romain', 'Sacha'],
    last: ['Arnaud', 'Bertrand', 'Chevalier', 'Dufour', 'Etienne', 'Fontaine', 'Girard', 'Hamel', 'Joubert', 'Lambert', 'Marchand', 'Noel', 'Perrin', 'Renaud', 'Sauvage', 'Tessier', 'Vasseur', 'Barbier', 'Collet', 'Delmas', 'Gautier', 'Lemaire', 'Roussel', 'Vidal'],
  },
  maghreb: {
    first: ['Adel', 'Bilal', 'Driss', 'Farid', 'Hakim', 'Ilyas', 'Karim', 'Mehdi', 'Nabil', 'Omar', 'Rayan', 'Samir', 'Tarik', 'Walid', 'Yassine', 'Zakaria', 'Anis', 'Hamza', 'Ismail', 'Marwan', 'Sofiane', 'Amine', 'Reda', 'Youssef'],
    last: ['Amrani', 'Belkadi', 'Chaouki', 'Daoudi', 'El Fassi', 'Ghazali', 'Haddad', 'Idrissi', 'Jabri', 'Kettani', 'Lahlou', 'Mansouri', 'Naciri', 'Ouali', 'Rahmani', 'Saidi', 'Tazi', 'Bennani', 'Cherif', 'Hamdi', 'Karimi', 'Ziani', 'Brahimi', 'Mekki'],
  },
  egyptian: {
    first: ['Ahmed', 'Basem', 'Hazem', 'Karim', 'Mahmoud', 'Mostafa', 'Omar', 'Ramy', 'Sherif', 'Tamer', 'Yasser', 'Ziad', 'Amr', 'Hossam', 'Khaled', 'Marwan', 'Nader', 'Sayed', 'Wael', 'Islam', 'Ayman', 'Fady', 'Hany', 'Magdy'],
    last: ['Abdelaziz', 'Badawi', 'Darwish', 'Fathy', 'Gamal', 'Hamdy', 'Kamel', 'Mansour', 'Naguib', 'Osman', 'Ragab', 'Shawky', 'Taha', 'Youssef', 'Zaki', 'Ashour', 'Fouad', 'Helmy', 'Lotfy', 'Mekawy', 'Rashad', 'Sabry', 'Wahba', 'Ezzat'],
  },
  germanic: {
    first: ['Anton', 'Benedikt', 'Christoph', 'David', 'Elias', 'Felix', 'Hannes', 'Jonas', 'Kilian', 'Lukas', 'Moritz', 'Niklas', 'Paul', 'Raphael', 'Simon', 'Tobias', 'Valentin', 'Yannick', 'Fabian', 'Leon', 'Marco', 'Nico', 'Stefan', 'Timo'],
    last: ['Albrecht', 'Brandt', 'Dietrich', 'Engel', 'Frank', 'Gruber', 'Hartmann', 'Jung', 'Keller', 'Lindner', 'Maurer', 'Neumann', 'Pfeiffer', 'Ritter', 'Steiner', 'Vogel', 'Winkler', 'Zimmer', 'Baumann', 'Huber', 'Kraus', 'Lehmann', 'Sommer', 'Wolf'],
  },
  swiss: {
    first: ['Andrin', 'Cedric', 'Dario', 'Gian', 'Joel', 'Levin', 'Luca', 'Nils', 'Noah', 'Remo', 'Silvan', 'Yannis', 'Fabio', 'Loris', 'Marc', 'Renato', 'Elia', 'Jan', 'Mattia', 'Robin', 'Kevin', 'Pascal', 'Sandro', 'Ilan'],
    last: ['Ammann', 'Baumgartner', 'Bianchi', 'Brunner', 'Favre', 'Fischer', 'Gerber', 'Kaufmann', 'Meier', 'Moser', 'Rossier', 'Suter', 'Widmer', 'Zbinden', 'Blaser', 'Christen', 'Frei', 'Imhof', 'Kunz', 'Marti', 'Rey', 'Schmid', 'Vuilleumier', 'Zehnder'],
  },
  nordic: {
    first: ['Anders', 'Bjorn', 'Eirik', 'Emil', 'Fredrik', 'Henrik', 'Isak', 'Jonas', 'Kristian', 'Lars', 'Magnus', 'Oskar', 'Rasmus', 'Sander', 'Tobias', 'Viktor', 'Elias', 'Filip', 'Gustav', 'Joakim', 'Mikkel', 'Sindre', 'Torbjorn', 'Vegard'],
    last: ['Aasen', 'Berg', 'Dahl', 'Eriksen', 'Fjeld', 'Haugen', 'Johansen', 'Karlsen', 'Lund', 'Moe', 'Nygaard', 'Olsen', 'Pedersen', 'Ruud', 'Solberg', 'Strand', 'Vik', 'Holm', 'Lindqvist', 'Nyberg', 'Sandberg', 'Ekstrom', 'Bakke', 'Hagen'],
  },
  dutch: {
    first: ['Bram', 'Daan', 'Jesse', 'Joost', 'Lars', 'Luuk', 'Milan', 'Niels', 'Ruben', 'Sem', 'Stijn', 'Thijs', 'Tim', 'Wout', 'Bas', 'Jelle', 'Koen', 'Mats', 'Pim', 'Sven', 'Teun', 'Jurrien', 'Rick', 'Gijs'],
    last: ['Bakker', 'de Boer', 'Dekker', 'van Dijk', 'Hendriks', 'Jansen', 'Kok', 'de Lange', 'Meijer', 'Mulder', 'Peters', 'Smit', 'Visser', 'de Wit', 'Bosman', 'van Leeuwen', 'Kuiper', 'Postma', 'Schouten', 'Verhoeven', 'Willems', 'Brouwer', 'Koster', 'Veenstra'],
  },
  belgian: {
    first: ['Arne', 'Bart', 'Cedric', 'Dries', 'Jelle', 'Joris', 'Kobe', 'Lander', 'Mathieu', 'Nathan', 'Robbe', 'Senne', 'Thibaut', 'Wout', 'Yari', 'Ward', 'Maxim', 'Louis', 'Brecht', 'Jonas', 'Arthur', 'Lucas', 'Aster', 'Michiel'],
    last: ['Claes', 'Declercq', 'Goossens', 'Janssens', 'Lambrecht', 'Maes', 'Peeters', 'Segers', 'Vermeulen', 'Wouters', 'Dubois', 'Lemoine', 'Mertens', 'Pauwels', 'Raes', 'Verstraete', 'Desmet', 'Michiels', 'Hermans', 'Lefevre', 'Coppens', 'Baert', 'Nys', 'Thys'],
  },
  japanese: {
    first: ['Daiki', 'Haruto', 'Hiroki', 'Kaito', 'Kenta', 'Koji', 'Riku', 'Ryota', 'Shota', 'Sora', 'Takumi', 'Yuki', 'Yuto', 'Asahi', 'Hayato', 'Itsuki', 'Kazuki', 'Naoki', 'Ren', 'Sota', 'Taiga', 'Tsubasa', 'Yamato', 'Kosei'],
    last: ['Aoki', 'Fujita', 'Hayashi', 'Ikeda', 'Kato', 'Kimura', 'Kobayashi', 'Matsuda', 'Mori', 'Nakajima', 'Ogawa', 'Saito', 'Shimizu', 'Takahashi', 'Ueda', 'Yamamoto', 'Yoshida', 'Inoue', 'Kondo', 'Murata', 'Okada', 'Sakamoto', 'Takeda', 'Watanabe'],
  },
  westAfrican: {
    first: ['Abdou', 'Amadou', 'Bakary', 'Cheikh', 'Djibril', 'Ibrahima', 'Kofi', 'Kwame', 'Lamine', 'Mamadou', 'Moussa', 'Ousmane', 'Pape', 'Seydou', 'Souleymane', 'Yaw', 'Kojo', 'Emmanuel', 'Junior', 'Serge', 'Wilfried', 'Yves', 'Fode', 'Idrissa'],
    last: ['Bamba', 'Camara', 'Diallo', 'Diop', 'Fofana', 'Gueye', 'Kone', 'Mensah', 'Ndiaye', 'Owusu', 'Sarr', 'Sow', 'Toure', 'Traore', 'Boateng', 'Asante', 'Coulibaly', 'Kouassi', 'Sylla', 'Badji', 'Agyei', 'Ouattara', 'Seck', 'Yeboah'],
  },
  centralAfrican: {
    first: ['Arthur', 'Cedric', 'Chancel', 'Dieumerci', 'Elie', 'Gael', 'Glody', 'Herve', 'Jordan', 'Merveille', 'Nathan', 'Prince', 'Rodrigue', 'Samuel', 'Theo', 'Yannick', 'Junior', 'Christ', 'Fiston', 'Gedeon', 'Joel', 'Patient', 'Silas', 'Tresor'],
    last: ['Bokanga', 'Kabamba', 'Kalonji', 'Kasongo', 'Lukusa', 'Makiadi', 'Mbuyi', 'Mputu', 'Ngoy', 'Ilunga', 'Kabeya', 'Kayembe', 'Lusamba', 'Mabiala', 'Matondo', 'Mulumba', 'Nsimba', 'Tshibangu', 'Kiala', 'Bolamba', 'Mavuela', 'Nkulu', 'Banza', 'Zola'],
  },
  southernAfrican: {
    first: ['Bongani', 'Lebo', 'Lungelo', 'Mandla', 'Mpho', 'Neo', 'Sipho', 'Thabo', 'Themba', 'Tshepo', 'Vusi', 'Zakhele', 'Kagiso', 'Siyabonga', 'Lwazi', 'Teboho', 'Katlego', 'Sandile', 'Thulani', 'Musa', 'Kamo', 'Bandile', 'Nkosi', 'Ayanda'],
    last: ['Dlamini', 'Khumalo', 'Mabaso', 'Mokoena', 'Ndlovu', 'Nkosi', 'Radebe', 'Sithole', 'Zulu', 'Mthembu', 'Molefe', 'Ngcobo', 'Mahlangu', 'Shabalala', 'Masilela', 'Cele', 'Baloyi', 'Maluleke', 'Mkhize', 'Tau', 'Modise', 'Hlongwane', 'Zwane', 'Nel'],
  },
  balkan: {
    first: ['Ante', 'Dario', 'Duje', 'Edin', 'Ermin', 'Haris', 'Ivan', 'Josip', 'Kenan', 'Luka', 'Marin', 'Mateo', 'Nikola', 'Petar', 'Stipe', 'Toni', 'Vedran', 'Adnan', 'Amar', 'Bruno', 'Domagoj', 'Emir', 'Filip', 'Tarik'],
    last: ['Babic', 'Begic', 'Brekalo', 'Delic', 'Hadzic', 'Juric', 'Kovac', 'Lovric', 'Mandic', 'Novak', 'Pavlovic', 'Radic', 'Selimovic', 'Tomic', 'Vukovic', 'Zeljko', 'Basic', 'Cosic', 'Grgic', 'Hodzic', 'Kalinic', 'Maric', 'Sabic', 'Vidovic'],
  },
  austrian: {
    first: ['Alexander', 'Christoph', 'Dominik', 'Florian', 'Julian', 'Kevin', 'Lukas', 'Marcel', 'Matthias', 'Michael', 'Patrick', 'Philipp', 'Sebastian', 'Stefan', 'Thomas', 'Andreas', 'Martin', 'Maximilian', 'Nicolas', 'Romano', 'Daniel', 'Konrad', 'Marko', 'Valentin'],
    last: ['Auer', 'Berger', 'Eder', 'Fuchs', 'Gruber', 'Hofer', 'Huber', 'Kainz', 'Lechner', 'Leitner', 'Mayr', 'Moser', 'Pichler', 'Reiter', 'Schwarz', 'Steiner', 'Wagner', 'Wieser', 'Brunner', 'Egger', 'Haas', 'Koller', 'Strasser', 'Winkler'],
  },
  swedish: {
    first: ['Albin', 'Alexander', 'Anton', 'Carl', 'Erik', 'Hampus', 'Hugo', 'Isak', 'Jesper', 'Linus', 'Ludvig', 'Melker', 'Olle', 'Pontus', 'Samuel', 'Sebastian', 'Viktor', 'Wilhelm', 'Axel', 'Emil', 'Filip', 'Jonatan', 'Kalle', 'Noel'],
    last: ['Andersson', 'Berglund', 'Bjork', 'Ek', 'Forsberg', 'Gustafsson', 'Hedlund', 'Isaksson', 'Jonsson', 'Karlsson', 'Lindgren', 'Magnusson', 'Nilsson', 'Olofsson', 'Persson', 'Sjoberg', 'Svensson', 'Wallin', 'Aberg', 'Dahlqvist', 'Engstrom', 'Holmberg', 'Lundin', 'Strom'],
  },
  australian: {
    first: ['Aiden', 'Blake', 'Brodie', 'Cooper', 'Dylan', 'Flynn', 'Hayden', 'Jackson', 'Jai', 'Kane', 'Lachlan', 'Mitchell', 'Nathan', 'Riley', 'Ryan', 'Tom', 'Zac', 'Bailey', 'Corey', 'Harrison', 'Jordan', 'Kye', 'Max', 'Tristan'],
    last: ['Abbott', 'Baxter', 'Cartwright', 'Doyle', 'Edwards', 'Fraser', 'Gallagher', 'Hanley', 'Kerr', 'Lawson', 'McKay', 'Nolan', "O'Brien", 'Prescott', 'Quinlan', 'Roche', 'Sullivan', 'Tate', 'Walsh', 'Bennett', 'Coleman', 'Dunn', 'Murray', 'Reid'],
  },
  american: {
    first: ['Brandon', 'Caleb', 'Chase', 'Cole', 'Derek', 'Evan', 'Gavin', 'Hunter', 'Jalen', 'Logan', 'Malik', 'Miles', 'Nolan', 'Parker', 'Quinn', 'Tanner', 'Trey', 'Zane', 'Andre', 'Cameron', 'Darius', 'Jordan', 'Marcus', 'Devin'],
    last: ['Anderson', 'Bishop', 'Carter', 'Dalton', 'Ellis', 'Foster', 'Graves', 'Hayes', 'Jennings', 'Keller', 'Lawrence', 'Monroe', 'Nash', 'Porter', 'Reed', 'Sutton', 'Turner', 'Walker', 'Bryant', 'Coleman', 'Griffin', 'Harper', 'Mitchell', 'Wade'],
  },
  canadian: {
    first: ['Aidan', 'Alexandre', 'Benoit', 'Cole', 'Dominic', 'Ethan', 'Gabriel', 'Jacob', 'Jayden', 'Justin', 'Liam', 'Marc-Andre', 'Nathan', 'Olivier', 'Raphael', 'Riley', 'Samuel', 'Tristan', 'Xavier', 'Zachary', 'Kamal', 'Theo', 'Logan', 'Malcolm'],
    last: ['Arsenault', 'Beaulieu', 'Campbell', 'Desrosiers', 'Fraser', 'Gagnon', 'Hughes', 'Lafleur', 'MacDonald', 'Morin', 'Ouellet', 'Pelletier', 'Robertson', 'Tremblay', 'Wilson', 'Bouchard', 'Cote', 'Fortin', 'Gauthier', 'Leblanc', 'McLean', 'Poirier', 'Stewart', 'Young'],
  },
};

// Small deterministic PRNG (mulberry32) so squads are stable across sessions.
export function seededRng(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
