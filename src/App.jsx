import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";

let DUTIES =[{"z":"Zone 1","t":"weekday","r":"SZ1/01","d2":"005001","s":"04:42","rl":"Garage","dp":"04:50","e":"10:02","ft":"09:50","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.33,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/02","d2":"005002","s":"04:46","rl":"Garage","dp":"04:54","e":"10:32","ft":"10:20","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.77,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/03","d2":"005003","s":"05:02","rl":"Garage","dp":"05:10","e":"10:15","ft":"10:15","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.22,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/04","d2":"005004","s":"05:12","rl":"Garage","dp":"05:20","e":"10:10","ft":"10:10","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":4.97,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/05","d2":"005005","s":"05:16","rl":"Garage","dp":"05:24","e":"12:02","ft":"11:50","fl":"Abbey St","bs":"08:10","bsl":"Abbey St","be":"09:10","bel":"Abbey St","w":5.77,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/06","d2":"005006","s":"05:17","rl":"Garage","dp":"05:25","e":"10:37","ft":"10:20","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.33,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/07","d2":"005007","s":"05:22","rl":"Garage","dp":"05:30","e":"10:12","ft":"10:00","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.83,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/08","d2":"005008","s":"05:26","rl":"Garage","dp":"05:34","e":"10:30","ft":"10:30","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.07,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/09","d2":"005009","s":"05:31","rl":"Garage","dp":"05:39","e":"10:20","ft":"10:20","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":4.82,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/10","d2":"005010","s":"05:32","rl":"Garage","dp":"05:40","e":"10:42","ft":"10:30","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.17,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/11","d2":"005011","s":"05:35","rl":"Garage","dp":"05:43","e":"11:22","ft":"11:10","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.78,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/12","d2":"005012","s":"05:36","rl":"Garage","dp":"05:44","e":"13:12","ft":"13:00","fl":"Abbey St","bs":"09:47","bsl":"Garage","be":"10:50","bel":"Garage","w":6.6,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/13","d2":"005013","s":"05:37","rl":"Garage","dp":"05:45","e":"13:17","ft":"13:00","fl":"Townsend St","bs":"10:05","bsl":"Garage","be":"11:20","bel":"Pearse St","w":6.7,"l":0.97,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/14","d2":"005014","s":"05:42","rl":"Garage","dp":"05:50","e":"11:02","ft":"10:50","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.33,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/15","d2":"005015","s":"05:46","rl":"Garage","dp":"05:54","e":"10:42","ft":"10:25","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.93,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/16","d2":"005016","s":"05:47","rl":"Garage","dp":"05:55","e":"11:12","ft":"11:00","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.42,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/17","d2":"005017","s":"05:52","rl":"Garage","dp":"06:00","e":"13:02","ft":"12:50","fl":"Abbey St","bs":"09:05","bsl":"Pearse St","be":"10:00","bel":"Abbey St","w":6.25,"l":0.92,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/18","d2":"005018","s":"05:56","rl":"Garage","dp":"06:04","e":"13:22","ft":"13:10","fl":"Abbey St","bs":"09:10","bsl":"Abbey St","be":"10:20","bel":"Abbey St","w":6.27,"l":1.17,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/19","d2":"005019","s":"06:01","rl":"Garage","dp":"06:09","e":"14:42","ft":"14:30","fl":"Abbey St","bs":"10:10","bsl":"Garage","be":"11:24","bel":"Garage","w":7.5,"l":1.18,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/20","d2":"005020","s":"06:02","rl":"Garage","dp":"06:10","e":"14:52","ft":"14:40","fl":"Abbey St","bs":"10:40","bsl":"Pearse St","be":"11:40","bel":"Abbey St","w":7.83,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/21","d2":"005021","s":"06:06","rl":"Garage","dp":"06:14","e":"14:37","ft":"14:20","fl":"Pearse St","bs":"09:00","bsl":"Abbey St","be":"10:20","bel":"Pearse St","w":7.18,"l":1.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/22","d2":"005022","s":"06:09","rl":"Garage","dp":"06:17","e":"14:10","ft":"14:10","fl":"Garage","bs":"09:55","bsl":"Garage","be":"11:10","bel":"Abbey St","w":6.97,"l":1.05,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/23","d2":"005023","s":"06:12","rl":"Garage","dp":"06:20","e":"15:12","ft":"14:55","fl":"Pearse St","bs":"11:25","bsl":"Pearse St","be":"12:25","bel":"Pearse St","w":8,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/24","d2":"005024","s":"06:13","rl":"Garage","dp":"06:21","e":"15:57","ft":"15:40","fl":"Townsend St","bs":"10:25","bsl":"Townsend St","be":"11:20","bel":"Townsend St","w":8.82,"l":0.92,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/25","d2":"005025","s":"06:15","rl":"Garage","dp":"06:23","e":"11:57","ft":"11:40","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.7,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/26","d2":"005026","s":"06:16","rl":"Garage","dp":"06:24","e":"14:02","ft":"13:50","fl":"Abbey St","bs":"09:35","bsl":"Garage","be":"11:00","bel":"Abbey St","w":6.55,"l":1.22,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/27","d2":"005027","s":"06:17","rl":"Garage","dp":"06:25","e":"15:32","ft":"15:20","fl":"Abbey St","bs":"11:20","bsl":"Abbey St","be":"12:20","bel":"Abbey St","w":8.25,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/28","d2":"005028","s":"06:22","rl":"Garage","dp":"06:30","e":"15:37","ft":"15:20","fl":"Townsend St","bs":"11:35","bsl":"Abbey St","be":"13:00","bel":"Townsend St","w":7.83,"l":1.42,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/29","d2":"005029","s":"06:25","rl":"Garage","dp":"06:33","e":"15:47","ft":"15:30","fl":"Townsend St","bs":"09:35","bsl":"Townsend St","be":"10:25","bel":"Townsend St","w":8.53,"l":0.83,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/30","d2":"005030","s":"06:27","rl":"Garage","dp":"06:35","e":"15:42","ft":"15:25","fl":"Pearse St","bs":"09:00","bsl":"Garage","be":"10:25","bel":"Pearse St","w":8.12,"l":1.13,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/31","d2":"005031","s":"06:31","rl":"Garage","dp":"06:39","e":"15:27","ft":"15:10","fl":"Pearse St","bs":"11:20","bsl":"Pearse St","be":"12:15","bel":"Townsend St","w":8.02,"l":0.92,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/32","d2":"005032","s":"06:32","rl":"Garage","dp":"06:40","e":"15:32","ft":"15:15","fl":"Townsend St","bs":"11:55","bsl":"Pearse St","be":"12:45","bel":"Townsend St","w":8.17,"l":0.83,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/33","d2":"005033","s":"11:35","rl":"Pearse St","dp":"11:55","e":"20:55","ft":"20:55","fl":"Garage","bs":"17:00","bsl":"Pearse St","be":"18:00","bel":"Abbey St","w":8.33,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/34","d2":"005034","s":"11:35","rl":"Abbey St","dp":"11:50","e":"21:07","ft":"20:50","fl":"Townsend St","bs":"14:50","bsl":"Abbey St","be":"16:00","bel":"Townsend St","w":8.37,"l":1.17,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/35","d2":"005035","s":"11:40","rl":"Pearse St","dp":"12:00","e":"20:20","ft":"20:20","fl":"Garage","bs":"16:00","bsl":"Townsend St","be":"17:30","bel":"Abbey St","w":7.17,"l":1.5,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/36","d2":"005036","s":"11:45","rl":"Abbey St","dp":"12:00","e":"20:00","ft":"20:00","fl":"Garage","bs":"15:00","bsl":"Abbey St","be":"16:40","bel":"Abbey St","w":6.58,"l":1.67,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/37","d2":"005037","s":"11:50","rl":"Pearse St","dp":"12:10","e":"20:45","ft":"20:45","fl":"Garage","bs":"17:00","bsl":"Townsend St","be":"18:05","bel":"Pearse St","w":7.83,"l":1.08,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/38","d2":"005038","s":"11:57","rl":"Garage","dp":"12:00","e":"20:30","ft":"20:30","fl":"Garage","bs":"14:10","bsl":"Abbey St","be":"15:45","bel":"Townsend St","w":6.97,"l":1.58,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/39","d2":"005039","s":"12:20","rl":"Townsend St","dp":"12:40","e":"21:45","ft":"21:45","fl":"Garage","bs":"15:00","bsl":"Townsend St","be":"16:30","bel":"Abbey St","w":7.92,"l":1.5,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/40","d2":"005040","s":"12:21","rl":"Garage","dp":"12:24","e":"20:25","ft":"20:25","fl":"Garage","bs":"15:30","bsl":"Abbey St","be":"17:05","bel":"Garage","w":6.73,"l":1.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/41","d2":"005041","s":"12:25","rl":"Abbey St","dp":"12:40","e":"22:10","ft":"22:10","fl":"Garage","bs":"15:40","bsl":"Abbey St","be":"17:25","bel":"Garage","w":8.25,"l":1.5,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/42","d2":"005042","s":"12:35","rl":"Abbey St","dp":"12:50","e":"21:27","ft":"21:10","fl":"Pearse St","bs":"15:50","bsl":"Abbey St","be":"17:05","bel":"Garage","w":7.87,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/43","d2":"005043","s":"12:55","rl":"Townsend St","dp":"13:15","e":"21:47","ft":"21:30","fl":"Townsend St","bs":"15:45","bsl":"Townsend St","be":"16:45","bel":"Pearse St","w":7.87,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/44","d2":"005044","s":"12:55","rl":"Abbey St","dp":"13:10","e":"20:42","ft":"20:30","fl":"Abbey St","bs":"16:10","bsl":"Abbey St","be":"17:40","bel":"Abbey St","w":6.28,"l":1.5,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/45","d2":"005045","s":"12:57","rl":"Garage","dp":"13:00","e":"21:40","ft":"21:40","fl":"Garage","bs":"15:10","bsl":"Abbey St","be":"16:30","bel":"Pearse St","w":7.38,"l":1.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/46","d2":"005046","s":"13:05","rl":"Abbey St","dp":"13:20","e":"21:47","ft":"21:30","fl":"Pearse St","bs":"16:20","bsl":"Abbey St","be":"17:15","bel":"Pearse St","w":7.78,"l":0.92,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/47","d2":"005047","s":"13:15","rl":"Abbey St","dp":"13:30","e":"20:45","ft":"20:45","fl":"Garage","bs":"16:30","bsl":"Abbey St","be":"17:50","bel":"Abbey St","w":6.17,"l":1.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/48","d2":"005048","s":"13:35","rl":"Abbey St","dp":"13:50","e":"21:05","ft":"21:05","fl":"Garage","bs":"16:50","bsl":"Abbey St","be":"18:10","bel":"Abbey St","w":6.17,"l":1.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/49","d2":"005049","s":"13:55","rl":"Abbey St","dp":"14:10","e":"20:57","ft":"20:45","fl":"Abbey St","bs":"17:30","bsl":"Abbey St","be":"18:35","bel":"Abbey St","w":5.95,"l":1.08,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/50","d2":"005050","s":"14:15","rl":"Abbey St","dp":"14:30","e":"21:50","ft":"21:50","fl":"Garage","bs":"17:50","bsl":"Abbey St","be":"19:00","bel":"Abbey St","w":6.42,"l":1.17,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/51","d2":"005051","s":"14:35","rl":"Abbey St","dp":"14:50","e":"24:25","ft":"24:25","fl":"Garage","bs":"18:10","bsl":"Abbey St","be":"19:15","bel":"Abbey St","w":8.75,"l":1.08,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/52","d2":"005052","s":"14:35","rl":"Pearse St","dp":"14:55","e":"23:26","ft":"23:26","fl":"Garage","bs":"17:55","bsl":"Pearse St","be":"19:10","bel":"Garage","w":7.93,"l":0.92,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/53","d2":"005053","s":"14:42","rl":"Garage","dp":"14:45","e":"24:30","ft":"24:30","fl":"Garage","bs":"19:30","bsl":"Townsend St","be":"20:30","bel":"Abbey St","w":8.8,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/54","d2":"005054","s":"14:45","rl":"Abbey St","dp":"15:00","e":"22:35","ft":"22:35","fl":"Garage","bs":"18:30","bsl":"Abbey St","be":"19:54","bel":"Garage","w":6.68,"l":1.15,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/55","d2":"005055","s":"14:50","rl":"Pearse St","dp":"15:10","e":"23:50","ft":"23:50","fl":"Garage","bs":"18:05","bsl":"Pearse St","be":"19:24","bel":"Garage","w":8.02,"l":0.98,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/56","d2":"005056","s":"14:52","rl":"Garage","dp":"14:55","e":"23:30","ft":"23:30","fl":"Garage","bs":"20:10","bsl":"Garage","be":"21:30","bel":"Pearse St","w":7.58,"l":1.05,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/57","d2":"005057","s":"14:55","rl":"Abbey St","dp":"15:10","e":"24:10","ft":"24:10","fl":"Garage","bs":"18:35","bsl":"Abbey St","be":"19:30","bel":"Townsend St","w":8.33,"l":0.92,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/58","d2":"005058","s":"15:00","rl":"Townsend St","dp":"15:20","e":"23:51","ft":"23:51","fl":"Garage","bs":"17:45","bsl":"Townsend St","be":"18:45","bel":"Abbey St","w":7.85,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/59","d2":"005059","s":"15:05","rl":"Pearse St","dp":"15:25","e":"24:55","ft":"24:55","fl":"Garage","bs":"20:10","bsl":"Garage","be":"21:30","bel":"Townsend St","w":8.78,"l":1.05,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/60","d2":"005060","s":"15:05","rl":"Abbey St","dp":"15:20","e":"24:30","ft":"24:30","fl":"Garage","bs":"18:45","bsl":"Abbey St","be":"19:45","bel":"Townsend St","w":8.42,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/61","d2":"005061","s":"15:10","rl":"Townsend St","dp":"15:30","e":"24:25","ft":"24:25","fl":"Garage","bs":"20:20","bsl":"Townsend St","be":"21:10","bel":"Pearse St","w":8.42,"l":0.83,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/62","d2":"005062","s":"15:15","rl":"Abbey St","dp":"15:30","e":"24:25","ft":"24:25","fl":"Garage","bs":"19:00","bsl":"Garage","be":"20:09","bel":"Garage","w":8.07,"l":1.1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/63","d2":"005063","s":"15:20","rl":"Townsend St","dp":"15:40","e":"25:00","ft":"25:00","fl":"Garage","bs":"20:05","bsl":"Garage","be":"21:09","bel":"Garage","w":8.65,"l":1.02,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/64","d2":"005064","s":"15:25","rl":"Abbey St","dp":"15:40","e":"24:25","ft":"24:25","fl":"Garage","bs":"19:00","bsl":"Abbey St","be":"20:00","bel":"Townsend St","w":8,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/65","d2":"005065","s":"15:45","rl":"Abbey St","dp":"16:00","e":"24:30","ft":"24:30","fl":"Garage","bs":"19:15","bsl":"Abbey St","be":"20:20","bel":"Townsend St","w":7.67,"l":1.08,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/66","d2":"005066","s":"16:47","rl":"Garage","dp":"16:50","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:45","bsl":"Townsend St","be":"20:45","bel":"Abbey St","w":7.05,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/67","d2":"005067","s":"17:07","rl":"Garage","dp":"17:10","e":"24:50","ft":"24:50","fl":"Garage","bs":"20:00","bsl":"Townsend St","be":"20:50","bel":"Townsend St","w":6.88,"l":0.83,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/91","d2":"005091","s":"18:10","rl":"Pearse St","dp":"18:30","e":"27:36","ft":"27:36","fl":"Garage","bs":"22:35","bsl":"Garage","be":"24:00","bel":"Garage","w":8.07,"l":1.37,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/92","d2":"005092","s":"18:15","rl":"Abbey St","dp":"18:30","e":"26:36","ft":"26:36","fl":"Garage","bs":"21:20","bsl":"Garage","be":"22:24","bel":"Garage","w":7.33,"l":1.02,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/93","d2":"005093","s":"21:07","rl":"Garage","dp":"21:10","e":"30:00","ft":"30:00","fl":"Garage","bs":"25:00","bsl":"Garage","be":"26:24","bel":"Garage","w":7.53,"l":1.35,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/94","d2":"005094","s":"21:36","rl":"Garage","dp":"21:39","e":"29:36","ft":"29:36","fl":"Garage","bs":"26:06","bsl":"Garage","be":"27:24","bel":"Garage","w":6.75,"l":1.25,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/95","d2":"005095","s":"21:37","rl":"Garage","dp":"21:40","e":"30:11","ft":"30:11","fl":"Garage","bs":"24:05","bsl":"Garage","be":"25:54","bel":"Garage","w":6.8,"l":1.77,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/96","d2":"005096","s":"23:27","rl":"Garage","dp":"23:30","e":"29:00","ft":"29:00","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.55,"l":0,"b":false},{"z":"Zone 1","t":"weekday","r":"SZ1/1X","d2":"005068","s":"06:41","rl":"Garage","dp":"06:49","e":"16:12","ft":"16:00","fl":"Abbey St","bs":"12:00","bsl":"Abbey St","be":"13:00","bel":"Abbey St","w":8.52,"l":1,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/2X","d2":"005069","s":"06:42","rl":"Garage","dp":"06:50","e":"16:42","ft":"16:25","fl":"Townsend St","bs":"11:20","bsl":"Townsend St","be":"14:20","bel":"Pearse St","w":7,"l":3,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/3X","d2":"005070","s":"07:00","rl":"Garage","dp":"07:08","e":"16:15","ft":"16:15","fl":"Garage","bs":"10:10","bsl":"Garage","be":"11:35","bel":"Abbey St","w":8.03,"l":1.22,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/4X","d2":"005071","s":"07:01","rl":"Garage","dp":"07:09","e":"17:52","ft":"17:40","fl":"Abbey St","bs":"12:10","bsl":"Pearse St","be":"14:20","bel":"Abbey St","w":8.68,"l":2.17,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/5X","d2":"005072","s":"07:02","rl":"Garage","dp":"07:10","e":"16:52","ft":"16:40","fl":"Abbey St","bs":"12:20","bsl":"Abbey St","be":"13:40","bel":"Abbey St","w":8.5,"l":1.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/6X","d2":"005073","s":"07:09","rl":"Garage","dp":"07:17","e":"17:32","ft":"17:15","fl":"Pearse St","bs":"10:40","bsl":"Garage","be":"12:40","bel":"Garage","w":8.43,"l":1.95,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/7X","d2":"005074","s":"07:17","rl":"Garage","dp":"07:25","e":"17:02","ft":"16:45","fl":"Pearse St","bs":"10:10","bsl":"Garage","be":"11:40","bel":"Pearse St","w":8.53,"l":1.22,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/8X","d2":"005075","s":"07:22","rl":"Garage","dp":"07:30","e":"18:47","ft":"18:30","fl":"Pearse St","bs":"12:15","bsl":"Townsend St","be":"15:15","bel":"Townsend St","w":8.42,"l":3,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/9X","d2":"005076","s":"07:25","rl":"Garage","dp":"07:33","e":"19:15","ft":"19:15","fl":"Garage","bs":"12:45","bsl":"Townsend St","be":"16:50","bel":"Abbey St","w":7.75,"l":4.08,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/10X","d2":"005077","s":"07:32","rl":"Garage","dp":"07:40","e":"19:15","ft":"19:15","fl":"Garage","bs":"12:25","bsl":"Pearse St","be":"15:50","bel":"Abbey St","w":8.3,"l":3.42,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/11X","d2":"005078","s":"07:55","rl":"Abbey St","dp":"08:10","e":"18:12","ft":"18:00","fl":"Abbey St","bs":"11:05","bsl":"Garage","be":"14:40","bel":"Abbey St","w":6.9,"l":3.38,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/12X","d2":"005079","s":"07:55","rl":"Garage","dp":"08:03","e":"19:35","ft":"19:35","fl":"Garage","bs":"13:15","bsl":"Townsend St","be":"16:25","bel":"Townsend St","w":8.5,"l":3.17,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/13X","d2":"005080","s":"08:17","rl":"Garage","dp":"08:25","e":"19:45","ft":"19:45","fl":"Garage","bs":"13:30","bsl":"Abbey St","be":"17:00","bel":"Townsend St","w":7.97,"l":3.5,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/14X","d2":"005081","s":"08:45","rl":"Abbey St","dp":"09:00","e":"19:15","ft":"19:15","fl":"Garage","bs":"11:40","bsl":"Abbey St","be":"15:00","bel":"Pearse St","w":7.17,"l":3.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/15X","d2":"005082","s":"08:45","rl":"Pearse St","dp":"09:05","e":"19:30","ft":"19:30","fl":"Garage","bs":"12:40","bsl":"Townsend St","be":"16:10","bel":"Abbey St","w":7.25,"l":3.5,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/16X","d2":"005083","s":"09:15","rl":"Townsend St","dp":"09:35","e":"19:20","ft":"19:20","fl":"Garage","bs":"12:00","bsl":"Pearse St","be":"15:00","bel":"Townsend St","w":7.08,"l":3,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/17X","d2":"005084","s":"09:35","rl":"Abbey St","dp":"09:50","e":"19:25","ft":"19:25","fl":"Garage","bs":"12:40","bsl":"Abbey St","be":"16:10","bel":"Garage","w":6.58,"l":3.25,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/18X","d2":"005085","s":"10:15","rl":"Abbey St","dp":"10:30","e":"19:45","ft":"19:45","fl":"Garage","bs":"13:20","bsl":"Abbey St","be":"16:20","bel":"Abbey St","w":6.5,"l":3,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/19X","d2":"005086","s":"10:20","rl":"Pearse St","dp":"10:40","e":"19:50","ft":"19:50","fl":"Garage","bs":"15:00","bsl":"Pearse St","be":"17:45","bel":"Townsend St","w":6.75,"l":2.75,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/20X","d2":"005087","s":"10:35","rl":"Abbey St","dp":"10:50","e":"19:30","ft":"19:30","fl":"Garage","bs":"13:40","bsl":"Abbey St","be":"16:15","bel":"Garage","w":6.58,"l":2.33,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/21X","d2":"005088","s":"11:05","rl":"Abbey St","dp":"11:20","e":"19:45","ft":"19:45","fl":"Garage","bs":"14:20","bsl":"Abbey St","be":"17:00","bel":"Pearse St","w":6,"l":2.67,"b":true},{"z":"Zone 1","t":"weekday","r":"SZ1/22X","d2":"005089","s":"11:05","rl":"Pearse St","dp":"11:25","e":"20:00","ft":"20:00","fl":"Garage","bs":"16:30","bsl":"Pearse St","be":"17:55","bel":"Pearse St","w":7.5,"l":1.42,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/01","d2":"SZ1/01","s":"04:32","rl":"Garage","dp":"04:40","e":"10:12","ft":"09:55","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.67,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/02","d2":"SZ1/02","s":"04:46","rl":"Garage","dp":"04:54","e":"10:27","ft":"10:15","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.68,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/03","d2":"SZ1/03","s":"04:47","rl":"Garage","dp":"04:55","e":"12:17","ft":"12:00","fl":"Townsend St","bs":"09:25","bsl":"Abbey St","be":"10:20","bel":"Pearse St","w":6.58,"l":0.92,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/04","d2":"SZ1/04","s":"05:16","rl":"Garage","dp":"05:24","e":"12:12","ft":"11:55","fl":"Pearse St","bs":"08:15","bsl":"Abbey St","be":"09:20","bel":"Townsend St","w":5.85,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/05","d2":"SZ1/05","s":"05:17","rl":"Garage","dp":"05:25","e":"12:57","ft":"12:40","fl":"Townsend St","bs":"09:55","bsl":"Abbey St","be":"11:00","bel":"Pearse St","w":6.58,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/06","d2":"SZ1/06","s":"05:37","rl":"Garage","dp":"05:45","e":"13:07","ft":"12:55","fl":"Abbey St","bs":"09:20","bsl":"Townsend St","be":"10:40","bel":"Garage","w":6.58,"l":0.92,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/07","d2":"SZ1/07","s":"05:42","rl":"Garage","dp":"05:50","e":"13:27","ft":"13:15","fl":"Abbey St","bs":"09:00","bsl":"Pearse St","be":"10:15","bel":"Abbey St","w":6.5,"l":1.25,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/08","d2":"SZ1/08","s":"05:46","rl":"Garage","dp":"05:54","e":"13:17","ft":"13:05","fl":"Abbey St","bs":"08:30","bsl":"Abbey St","be":"10:05","bel":"Abbey St","w":5.93,"l":1.58,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/09","d2":"SZ1/09","s":"05:52","rl":"Garage","dp":"06:00","e":"13:27","ft":"13:10","fl":"Pearse St","bs":"09:35","bsl":"Townsend St","be":"10:40","bel":"Pearse St","w":6.5,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/10","d2":"SZ1/10","s":"06:01","rl":"Garage","dp":"06:09","e":"14:57","ft":"14:40","fl":"Pearse St","bs":"08:45","bsl":"Abbey St","be":"09:55","bel":"Pearse St","w":7.77,"l":1.17,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/11","d2":"SZ1/11","s":"06:06","rl":"Garage","dp":"06:14","e":"14:37","ft":"14:25","fl":"Abbey St","bs":"10:25","bsl":"Abbey St","be":"11:25","bel":"Abbey St","w":7.52,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/12","d2":"SZ1/12","s":"06:07","rl":"Garage","dp":"06:15","e":"15:37","ft":"15:20","fl":"Pearse St","bs":"10:20","bsl":"Pearse St","be":"11:20","bel":"Pearse St","w":8.5,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/13","d2":"SZ1/13","s":"06:12","rl":"Garage","dp":"06:20","e":"14:42","ft":"14:25","fl":"Pearse St","bs":"08:05","bsl":"Townsend St","be":"09:35","bel":"Townsend St","w":7,"l":1.5,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/14","d2":"SZ1/14","s":"06:16","rl":"Garage","dp":"06:24","e":"15:22","ft":"15:05","fl":"Townsend St","bs":"11:35","bsl":"Abbey St","be":"12:55","bel":"Pearse St","w":7.77,"l":1.33,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/15","d2":"SZ1/15","s":"06:22","rl":"Garage","dp":"06:30","e":"14:05","ft":"14:05","fl":"Garage","bs":"09:50","bsl":"Townsend St","be":"10:55","bel":"Abbey St","w":6.63,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/16","d2":"SZ1/16","s":"06:37","rl":"Garage","dp":"06:45","e":"15:15","ft":"15:15","fl":"Garage","bs":"08:15","bsl":"Townsend St","be":"09:50","bel":"Townsend St","w":7.05,"l":1.58,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/17","d2":"SZ1/17","s":"06:42","rl":"Garage","dp":"06:50","e":"15:17","ft":"15:00","fl":"Pearse St","bs":"08:45","bsl":"Townsend St","be":"10:15","bel":"Garage","w":7.5,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/18","d2":"SZ1/18","s":"06:52","rl":"Garage","dp":"07:00","e":"15:17","ft":"15:05","fl":"Abbey St","bs":"11:00","bsl":"Pearse St","be":"12:05","bel":"Abbey St","w":7.33,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/19","d2":"SZ1/19","s":"06:57","rl":"Garage","dp":"07:05","e":"15:57","ft":"15:45","fl":"Abbey St","bs":"11:40","bsl":"Pearse St","be":"12:45","bel":"Abbey St","w":7.92,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/20","d2":"SZ1/20","s":"07:11","rl":"Garage","dp":"07:19","e":"15:27","ft":"15:15","fl":"Abbey St","bs":"11:20","bsl":"Pearse St","be":"12:15","bel":"Abbey St","w":7.35,"l":0.92,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/21","d2":"SZ1/21","s":"07:12","rl":"Garage","dp":"07:20","e":"16:07","ft":"15:55","fl":"Abbey St","bs":"11:55","bsl":"Abbey St","be":"12:55","bel":"Abbey St","w":7.92,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/22","d2":"SZ1/22","s":"07:16","rl":"Garage","dp":"07:24","e":"14:17","ft":"14:05","fl":"Abbey St","bs":"10:05","bsl":"Abbey St","be":"11:05","bel":"Abbey St","w":6.02,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/23","d2":"SZ1/23","s":"07:45","rl":"Townsend St","dp":"08:05","e":"13:12","ft":"12:55","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.45,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/24","d2":"SZ1/24","s":"07:46","rl":"Garage","dp":"07:54","e":"16:57","ft":"16:40","fl":"Pearse St","bs":"10:35","bsl":"Abbey St","be":"11:40","bel":"Pearse St","w":8.1,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/25","d2":"SZ1/25","s":"07:55","rl":"Townsend St","dp":"08:15","e":"16:50","ft":"16:50","fl":"Garage","bs":"10:40","bsl":"Pearse St","be":"11:35","bel":"Abbey St","w":8,"l":0.92,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/26","d2":"SZ1/26","s":"08:00","rl":"Abbey St","dp":"08:15","e":"15:07","ft":"14:55","fl":"Abbey St","bs":"10:55","bsl":"Abbey St","be":"11:55","bel":"Abbey St","w":6.12,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/27","d2":"SZ1/27","s":"11:35","rl":"Pearse St","dp":"11:55","e":"20:00","ft":"20:00","fl":"Garage","bs":"16:20","bsl":"Townsend St","be":"17:45","bel":"Abbey St","w":7,"l":1.42,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/28","d2":"SZ1/28","s":"11:40","rl":"Townsend St","dp":"12:00","e":"21:27","ft":"21:10","fl":"Pearse St","bs":"16:55","bsl":"Pearse St","be":"18:20","bel":"Townsend St","w":8.37,"l":1.42,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/29","d2":"SZ1/29","s":"12:11","rl":"Garage","dp":"12:19","e":"21:25","ft":"21:25","fl":"Garage","bs":"15:25","bsl":"Abbey St","be":"16:54","bel":"Garage","w":8,"l":1.23,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/30","d2":"SZ1/30","s":"12:20","rl":"Abbey St","dp":"12:35","e":"20:20","ft":"20:20","fl":"Garage","bs":"15:35","bsl":"Abbey St","be":"17:15","bel":"Abbey St","w":6.33,"l":1.67,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/31","d2":"SZ1/31","s":"12:20","rl":"Pearse St","dp":"12:40","e":"21:45","ft":"21:45","fl":"Garage","bs":"17:25","bsl":"Pearse St","be":"19:00","bel":"Abbey St","w":7.83,"l":1.58,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/32","d2":"SZ1/32","s":"12:45","rl":"Townsend St","dp":"13:05","e":"21:25","ft":"21:25","fl":"Garage","bs":"17:40","bsl":"Townsend St","be":"18:35","bel":"Abbey St","w":7.75,"l":0.92,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/33","d2":"SZ1/33","s":"12:50","rl":"Abbey St","dp":"13:05","e":"22:27","ft":"22:10","fl":"Townsend St","bs":"16:05","bsl":"Abbey St","be":"17:20","bel":"Townsend St","w":8.37,"l":1.25,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/34","d2":"SZ1/34","s":"13:00","rl":"Abbey St","dp":"13:15","e":"20:27","ft":"20:15","fl":"Abbey St","bs":"16:25","bsl":"Abbey St","be":"17:35","bel":"Abbey St","w":6.28,"l":1.17,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/35","d2":"SZ1/35","s":"13:00","rl":"Townsend St","dp":"13:20","e":"21:07","ft":"20:50","fl":"Pearse St","bs":"16:20","bsl":"Garage","be":"17:50","bel":"Townsend St","w":6.9,"l":1.22,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/36","d2":"SZ1/36","s":"13:10","rl":"Abbey St","dp":"13:25","e":"21:57","ft":"21:40","fl":"Townsend St","bs":"16:40","bsl":"Garage","be":"18:20","bel":"Garage","w":7.17,"l":1.62,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/37","d2":"SZ1/37","s":"13:12","rl":"Garage","dp":"13:15","e":"21:55","ft":"21:55","fl":"Garage","bs":"15:25","bsl":"Townsend St","be":"16:55","bel":"Pearse St","w":7.22,"l":1.5,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/38","d2":"SZ1/38","s":"13:20","rl":"Abbey St","dp":"13:35","e":"22:15","ft":"22:15","fl":"Garage","bs":"16:35","bsl":"Abbey St","be":"17:40","bel":"Townsend St","w":7.83,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/39","d2":"SZ1/39","s":"13:50","rl":"Abbey St","dp":"14:05","e":"21:12","ft":"21:00","fl":"Abbey St","bs":"17:05","bsl":"Abbey St","be":"18:25","bel":"Abbey St","w":6.03,"l":1.33,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/40","d2":"SZ1/40","s":"14:30","rl":"Abbey St","dp":"14:45","e":"23:15","ft":"23:15","fl":"Garage","bs":"17:35","bsl":"Abbey St","be":"18:35","bel":"Townsend St","w":7.75,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/41","d2":"SZ1/41","s":"14:40","rl":"Abbey St","dp":"14:55","e":"23:51","ft":"23:51","fl":"Garage","bs":"17:45","bsl":"Abbey St","be":"18:45","bel":"Abbey St","w":8.18,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/42","d2":"SZ1/42","s":"14:40","rl":"Pearse St","dp":"15:00","e":"24:30","ft":"24:30","fl":"Garage","bs":"19:10","bsl":"Pearse St","be":"20:15","bel":"Abbey St","w":8.75,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/43","d2":"SZ1/43","s":"14:45","rl":"Townsend St","dp":"15:05","e":"23:26","ft":"23:26","fl":"Garage","bs":"20:00","bsl":"Townsend St","be":"21:00","bel":"Abbey St","w":7.68,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/44","d2":"SZ1/44","s":"14:50","rl":"Abbey St","dp":"15:05","e":"24:10","ft":"24:10","fl":"Garage","bs":"20:05","bsl":"Garage","be":"21:40","bel":"Townsend St","w":8.03,"l":1.3,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/45","d2":"SZ1/45","s":"15:00","rl":"Abbey St","dp":"15:15","e":"24:16","ft":"24:16","fl":"Garage","bs":"18:15","bsl":"Abbey St","be":"19:15","bel":"Abbey St","w":8.27,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/46","d2":"SZ1/46","s":"15:00","rl":"Pearse St","dp":"15:20","e":"24:35","ft":"24:35","fl":"Garage","bs":"19:20","bsl":"Garage","be":"20:30","bel":"Abbey St","w":8.62,"l":0.97,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/47","d2":"SZ1/47","s":"15:05","rl":"Townsend St","dp":"15:25","e":"24:05","ft":"24:05","fl":"Garage","bs":"20:10","bsl":"Garage","be":"21:50","bel":"Garage","w":7.38,"l":1.62,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/48","d2":"SZ1/48","s":"15:10","rl":"Abbey St","dp":"15:25","e":"23:55","ft":"23:55","fl":"Garage","bs":"17:35","bsl":"Garage","be":"19:10","bel":"Pearse St","w":7.45,"l":1.3,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/49","d2":"SZ1/49","s":"15:12","rl":"Garage","dp":"15:15","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:40","bsl":"Pearse St","be":"20:50","bel":"Pearse St","w":8.47,"l":1.17,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/50","d2":"SZ1/50","s":"15:40","rl":"Abbey St","dp":"15:55","e":"23:55","ft":"23:55","fl":"Garage","bs":"18:45","bsl":"Abbey St","be":"19:45","bel":"Abbey St","w":7.25,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/51","d2":"SZ1/51","s":"15:47","rl":"Garage","dp":"15:50","e":"24:30","ft":"24:30","fl":"Garage","bs":"20:30","bsl":"Abbey St","be":"22:10","bel":"Townsend St","w":7.05,"l":1.67,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/52","d2":"SZ1/52","s":"15:50","rl":"Abbey St","dp":"16:05","e":"24:25","ft":"24:25","fl":"Garage","bs":"19:00","bsl":"Abbey St","be":"20:00","bel":"Townsend St","w":7.58,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/53","d2":"SZ1/53","s":"16:00","rl":"Townsend St","dp":"16:20","e":"25:10","ft":"25:10","fl":"Garage","bs":"20:20","bsl":"Townsend St","be":"21:10","bel":"Pearse St","w":8.33,"l":0.83,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/54","d2":"SZ1/54","s":"16:10","rl":"Abbey St","dp":"16:25","e":"24:35","ft":"24:35","fl":"Garage","bs":"19:15","bsl":"Abbey St","be":"20:20","bel":"Townsend St","w":7.33,"l":1.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/55","d2":"SZ1/55","s":"16:50","rl":"Abbey St","dp":"17:05","e":"22:35","ft":"22:35","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.75,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/56","d2":"SZ1/56","s":"18:50","rl":"Pearse St","dp":"19:10","e":"24:30","ft":"24:30","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.67,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/57","d2":"SZ1/57","s":"19:20","rl":"Pearse St","dp":"19:40","e":"25:05","ft":"25:05","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.75,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/1X","d2":"SZ1/1X","s":"08:12","rl":"Garage","dp":"08:20","e":"16:57","ft":"16:45","fl":"Abbey St","bs":"12:40","bsl":"Pearse St","be":"13:55","bel":"Abbey St","w":7.5,"l":1.25,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/2X","d2":"SZ1/2X","s":"08:15","rl":"Abbey St","dp":"08:30","e":"17:37","ft":"17:20","fl":"Townsend St","bs":"11:05","bsl":"Abbey St","be":"12:40","bel":"Townsend St","w":7.78,"l":1.58,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/3X","d2":"SZ1/3X","s":"08:25","rl":"Townsend St","dp":"08:45","e":"18:47","ft":"18:35","fl":"Abbey St","bs":"13:40","bsl":"Townsend St","be":"15:45","bel":"Abbey St","w":8.28,"l":2.08,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/4X","d2":"SZ1/4X","s":"08:30","rl":"Abbey St","dp":"08:45","e":"18:07","ft":"17:50","fl":"Townsend St","bs":"11:25","bsl":"Abbey St","be":"13:10","bel":"Pearse St","w":7.87,"l":1.75,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/5X","d2":"SZ1/5X","s":"08:40","rl":"Pearse St","dp":"09:00","e":"17:27","ft":"17:15","fl":"Abbey St","bs":"13:05","bsl":"Townsend St","be":"14:15","bel":"Abbey St","w":7.62,"l":1.17,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/6X","d2":"SZ1/6X","s":"09:10","rl":"Abbey St","dp":"09:25","e":"18:52","ft":"18:35","fl":"Townsend St","bs":"12:05","bsl":"Abbey St","be":"13:25","bel":"Townsend St","w":8.37,"l":1.33,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/7X","d2":"SZ1/7X","s":"09:12","rl":"Garage","dp":"09:20","e":"18:37","ft":"18:20","fl":"Pearse St","bs":"13:25","bsl":"Townsend St","be":"14:25","bel":"Pearse St","w":8.42,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/8X","d2":"SZ1/8X","s":"09:21","rl":"Garage","dp":"09:29","e":"18:37","ft":"18:20","fl":"Townsend St","bs":"12:15","bsl":"Abbey St","be":"13:40","bel":"Townsend St","w":7.85,"l":1.42,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/9X","d2":"SZ1/9X","s":"09:31","rl":"Garage","dp":"09:39","e":"19:00","ft":"19:00","fl":"Garage","bs":"12:35","bsl":"Abbey St","be":"13:45","bel":"Abbey St","w":8.32,"l":1.17,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/10X","d2":"SZ1/10X","s":"09:32","rl":"Garage","dp":"09:40","e":"19:55","ft":"19:55","fl":"Garage","bs":"14:45","bsl":"Abbey St","be":"17:25","bel":"Pearse St","w":7.72,"l":2.67,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/11X","d2":"SZ1/11X","s":"09:40","rl":"Abbey St","dp":"09:55","e":"19:15","ft":"19:15","fl":"Garage","bs":"12:45","bsl":"Abbey St","be":"14:00","bel":"Garage","w":8.58,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/12X","d2":"SZ1/12X","s":"10:10","rl":"Abbey St","dp":"10:25","e":"19:25","ft":"19:25","fl":"Garage","bs":"13:25","bsl":"Abbey St","be":"14:25","bel":"Abbey St","w":8.25,"l":1,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/13X","d2":"SZ1/13X","s":"10:20","rl":"Abbey St","dp":"10:35","e":"18:37","ft":"18:25","fl":"Abbey St","bs":"13:35","bsl":"Abbey St","be":"15:35","bel":"Abbey St","w":6.28,"l":2,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/14X","d2":"SZ1/14X","s":"10:31","rl":"Garage","dp":"10:39","e":"19:35","ft":"19:35","fl":"Garage","bs":"13:45","bsl":"Abbey St","be":"16:35","bel":"Abbey St","w":6.23,"l":2.83,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/15X","d2":"SZ1/15X","s":"10:42","rl":"Garage","dp":"10:50","e":"19:45","ft":"19:45","fl":"Garage","bs":"13:20","bsl":"Townsend St","be":"14:40","bel":"Pearse St","w":7.72,"l":1.33,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/16X","d2":"SZ1/16X","s":"11:01","rl":"Garage","dp":"11:09","e":"19:57","ft":"19:45","fl":"Abbey St","bs":"14:15","bsl":"Abbey St","be":"16:45","bel":"Abbey St","w":6.43,"l":2.5,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/17X","d2":"SZ1/17X","s":"11:06","rl":"Garage","dp":"11:14","e":"19:27","ft":"19:10","fl":"Pearse St","bs":"13:55","bsl":"Abbey St","be":"16:40","bel":"Pearse St","w":5.6,"l":2.75,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/91","d2":"SZ1/91","s":"18:00","rl":"Abbey St","dp":"18:15","e":"26:36","ft":"26:36","fl":"Garage","bs":"20:55","bsl":"Garage","be":"22:24","bel":"Garage","w":7.17,"l":1.43,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/92","d2":"SZ1/92","s":"18:00","rl":"Pearse St","dp":"18:20","e":"26:06","ft":"26:06","fl":"Garage","bs":"19:55","bsl":"Garage","be":"21:39","bel":"Garage","w":6.42,"l":1.68,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/93","d2":"SZ1/93","s":"20:36","rl":"Garage","dp":"20:39","e":"30:06","ft":"30:06","fl":"Garage","bs":"24:50","bsl":"Garage","be":"25:54","bel":"Garage","w":8.48,"l":1.02,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/94","d2":"SZ1/94","s":"21:06","rl":"Garage","dp":"21:09","e":"30:00","ft":"30:00","fl":"Garage","bs":"25:05","bsl":"Garage","be":"26:24","bel":"Garage","w":7.63,"l":1.27,"b":true},{"z":"Zone 1","t":"saturday","r":"SZ1/95","d2":"SZ1/95","s":"23:27","rl":"Garage","dp":"23:30","e":"29:00","ft":"29:00","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.55,"l":0,"b":false},{"z":"Zone 1","t":"saturday","r":"SZ1/96","d2":"SZ1/96","s":"23:57","rl":"Garage","dp":"24:00","e":"29:30","ft":"29:30","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.55,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/01","d2":"005001","s":"04:46","rl":"Garage","dp":"04:54","e":"12:27","ft":"12:10","fl":"Pearse St","bs":"08:30","bsl":"Garage","be":"09:45","bel":"Garage","w":6.57,"l":1.12,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/02","d2":"005002","s":"04:52","rl":"Garage","dp":"05:00","e":"09:42","ft":"09:30","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.83,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/03","d2":"005003","s":"05:16","rl":"Garage","dp":"05:24","e":"12:42","ft":"12:30","fl":"Abbey St","bs":"08:31","bsl":"Garage","be":"09:39","bel":"Garage","w":6.35,"l":1.08,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/04","d2":"005004","s":"05:22","rl":"Garage","dp":"05:30","e":"10:12","ft":"10:00","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.83,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/05","d2":"005005","s":"05:46","rl":"Garage","dp":"05:54","e":"11:27","ft":"11:15","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.68,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/06","d2":"005006","s":"06:16","rl":"Garage","dp":"06:24","e":"13:40","ft":"13:40","fl":"Garage","bs":"09:15","bsl":"Abbey St","be":"10:39","bel":"Garage","w":6.25,"l":1.15,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/07","d2":"005007","s":"06:42","rl":"Garage","dp":"06:50","e":"14:25","ft":"14:25","fl":"Garage","bs":"09:00","bsl":"Abbey St","be":"10:10","bel":"Townsend St","w":6.55,"l":1.17,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/08","d2":"005008","s":"07:22","rl":"Garage","dp":"07:30","e":"12:12","ft":"11:55","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.83,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/09","d2":"005009","s":"07:27","rl":"Garage","dp":"07:35","e":"15:40","ft":"15:40","fl":"Garage","bs":"10:50","bsl":"Garage","be":"12:30","bel":"Abbey St","w":6.75,"l":1.47,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/10","d2":"005010","s":"07:46","rl":"Garage","dp":"07:54","e":"13:20","ft":"13:20","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.57,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/11","d2":"005011","s":"07:52","rl":"Garage","dp":"08:00","e":"12:32","ft":"12:15","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.67,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/12","d2":"005012","s":"07:57","rl":"Garage","dp":"08:05","e":"13:37","ft":"13:20","fl":"Townsend St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.67,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/13","d2":"005013","s":"08:12","rl":"Garage","dp":"08:20","e":"13:12","ft":"13:00","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/14","d2":"005014","s":"08:22","rl":"Garage","dp":"08:30","e":"15:07","ft":"14:50","fl":"Townsend St","bs":"10:10","bsl":"Townsend St","be":"11:10","bel":"Pearse St","w":5.75,"l":1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/15","d2":"005015","s":"08:27","rl":"Garage","dp":"08:35","e":"15:57","ft":"15:40","fl":"Pearse St","bs":"12:20","bsl":"Townsend St","be":"13:20","bel":"Townsend St","w":6.5,"l":1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/16","d2":"005016","s":"08:45","rl":"Abbey St","dp":"09:00","e":"14:12","ft":"14:00","fl":"Abbey St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.45,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/17","d2":"005017","s":"08:52","rl":"Garage","dp":"09:00","e":"13:32","ft":"13:15","fl":"Pearse St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.67,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/18","d2":"005018","s":"09:00","rl":"Abbey St","dp":"09:15","e":"15:42","ft":"15:25","fl":"Townsend St","bs":"12:00","bsl":"Garage","be":"13:15","bel":"Pearse St","w":5.73,"l":0.97,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/19","d2":"005019","s":"11:31","rl":"Garage","dp":"11:39","e":"20:35","ft":"20:35","fl":"Garage","bs":"14:30","bsl":"Abbey St","be":"16:05","bel":"Townsend St","w":7.48,"l":1.58,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/20","d2":"005020","s":"11:35","rl":"Pearse St","dp":"11:55","e":"20:57","ft":"20:45","fl":"Abbey St","bs":"16:45","bsl":"Townsend St","be":"18:50","bel":"Garage","w":7.62,"l":1.75,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/21","d2":"005021","s":"11:45","rl":"Abbey St","dp":"12:00","e":"20:20","ft":"20:20","fl":"Garage","bs":"14:50","bsl":"Garage","be":"16:20","bel":"Townsend St","w":7.37,"l":1.22,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/22","d2":"005022","s":"11:50","rl":"Pearse St","dp":"12:10","e":"20:42","ft":"20:30","fl":"Abbey St","bs":"16:10","bsl":"Pearse St","be":"17:45","bel":"Abbey St","w":7.28,"l":1.58,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/23","d2":"005023","s":"11:55","rl":"Pearse St","dp":"12:15","e":"21:30","ft":"21:30","fl":"Garage","bs":"14:55","bsl":"Pearse St","be":"16:15","bel":"Abbey St","w":8.25,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/24","d2":"005024","s":"11:57","rl":"Garage","dp":"12:00","e":"21:12","ft":"20:55","fl":"Pearse St","bs":"16:55","bsl":"Pearse St","be":"19:00","bel":"Garage","w":7.5,"l":1.75,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/25","d2":"005025","s":"12:01","rl":"Garage","dp":"12:09","e":"20:57","ft":"20:40","fl":"Pearse St","bs":"15:15","bsl":"Abbey St","be":"16:15","bel":"Pearse St","w":7.93,"l":1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/26","d2":"005026","s":"12:17","rl":"Garage","dp":"12:25","e":"21:42","ft":"21:25","fl":"Pearse St","bs":"15:35","bsl":"Pearse St","be":"16:55","bel":"Pearse St","w":8.08,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/27","d2":"005027","s":"12:30","rl":"Abbey St","dp":"12:45","e":"21:50","ft":"21:50","fl":"Garage","bs":"15:30","bsl":"Abbey St","be":"16:45","bel":"Abbey St","w":8.08,"l":1.25,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/28","d2":"005028","s":"12:45","rl":"Abbey St","dp":"13:00","e":"22:05","ft":"22:05","fl":"Garage","bs":"16:00","bsl":"Abbey St","be":"17:35","bel":"Garage","w":8,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/29","d2":"005029","s":"12:47","rl":"Garage","dp":"12:50","e":"21:30","ft":"21:30","fl":"Garage","bs":"18:00","bsl":"Abbey St","be":"19:40","bel":"Pearse St","w":7.05,"l":1.67,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/30","d2":"005030","s":"12:57","rl":"Garage","dp":"13:00","e":"21:42","ft":"21:30","fl":"Abbey St","bs":"17:55","bsl":"Pearse St","be":"19:00","bel":"Abbey St","w":7.67,"l":1.08,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/31","d2":"005031","s":"13:06","rl":"Garage","dp":"13:09","e":"21:37","ft":"21:20","fl":"Townsend St","bs":"16:15","bsl":"Abbey St","be":"17:45","bel":"Townsend St","w":7.02,"l":1.5,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/32","d2":"005032","s":"13:45","rl":"Abbey St","dp":"14:00","e":"21:12","ft":"21:00","fl":"Abbey St","bs":"17:00","bsl":"Abbey St","be":"18:30","bel":"Abbey St","w":5.95,"l":1.5,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/33","d2":"005033","s":"14:06","rl":"Garage","dp":"14:09","e":"21:27","ft":"21:15","fl":"Abbey St","bs":"17:15","bsl":"Abbey St","be":"18:45","bel":"Abbey St","w":5.85,"l":1.5,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/34","d2":"005034","s":"14:30","rl":"Townsend St","dp":"14:50","e":"24:15","ft":"24:15","fl":"Garage","bs":"19:10","bsl":"Pearse St","be":"20:25","bel":"Pearse St","w":8.5,"l":1.25,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/35","d2":"005035","s":"14:35","rl":"Pearse St","dp":"14:55","e":"24:20","ft":"24:20","fl":"Garage","bs":"19:35","bsl":"Townsend St","be":"20:55","bel":"Pearse St","w":8.42,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/36","d2":"005036","s":"14:36","rl":"Garage","dp":"14:39","e":"24:10","ft":"24:10","fl":"Garage","bs":"17:45","bsl":"Abbey St","be":"19:10","bel":"Pearse St","w":8.15,"l":1.42,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/37","d2":"005037","s":"15:00","rl":"Abbey St","dp":"15:15","e":"23:46","ft":"23:46","fl":"Garage","bs":"20:10","bsl":"Garage","be":"21:30","bel":"Abbey St","w":7.63,"l":1.13,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/38","d2":"005038","s":"15:15","rl":"Abbey St","dp":"15:30","e":"23:55","ft":"23:55","fl":"Garage","bs":"18:30","bsl":"Abbey St","be":"19:35","bel":"Townsend St","w":7.58,"l":1.08,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/39","d2":"005039","s":"15:15","rl":"Pearse St","dp":"15:35","e":"24:50","ft":"24:50","fl":"Garage","bs":"20:25","bsl":"Pearse St","be":"21:25","bel":"Pearse St","w":8.58,"l":1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/40","d2":"005040","s":"15:20","rl":"Pearse St","dp":"15:40","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:40","bsl":"Pearse St","be":"20:40","bel":"Pearse St","w":8.5,"l":1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/41","d2":"005041","s":"15:36","rl":"Garage","dp":"15:39","e":"24:16","ft":"24:16","fl":"Garage","bs":"18:45","bsl":"Abbey St","be":"20:20","bel":"Garage","w":7.33,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/42","d2":"005042","s":"15:45","rl":"Abbey St","dp":"16:00","e":"24:25","ft":"24:25","fl":"Garage","bs":"19:00","bsl":"Abbey St","be":"20:15","bel":"Abbey St","w":7.42,"l":1.25,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/43","d2":"005043","s":"16:25","rl":"Townsend St","dp":"16:45","e":"24:40","ft":"24:40","fl":"Garage","bs":"19:40","bsl":"Garage","be":"21:00","bel":"Abbey St","w":7.12,"l":1.13,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/44","d2":"005044","s":"16:45","rl":"Abbey St","dp":"17:00","e":"25:00","ft":"25:00","fl":"Garage","bs":"19:45","bsl":"Abbey St","be":"21:15","bel":"Abbey St","w":6.75,"l":1.5,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/45","d2":"005045","s":"17:00","rl":"Abbey St","dp":"17:15","e":"22:31","ft":"22:31","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.52,"l":0,"b":false},{"z":"Zone 1","t":"sunday","r":"SZ1/46","d2":"005046","s":"17:15","rl":"Abbey St","dp":"17:30","e":"24:25","ft":"24:25","fl":"Garage","bs":"20:15","bsl":"Abbey St","be":"21:20","bel":"Townsend St","w":6.08,"l":1.08,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/1X","d2":"005071","s":"09:11","rl":"Garage","dp":"09:19","e":"16:37","ft":"16:20","fl":"Townsend St","bs":"11:10","bsl":"Pearse St","be":"12:20","bel":"Townsend St","w":6.27,"l":1.17,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/2X","d2":"005072","s":"09:12","rl":"Garage","dp":"09:20","e":"18:02","ft":"17:45","fl":"Townsend St","bs":"14:20","bsl":"Garage","be":"16:10","bel":"Pearse St","w":7.28,"l":1.55,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/3X","d2":"005073","s":"09:15","rl":"Abbey St","dp":"09:30","e":"18:30","ft":"18:30","fl":"Garage","bs":"12:00","bsl":"Abbey St","be":"13:24","bel":"Garage","w":8.1,"l":1.15,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/4X","d2":"005074","s":"09:45","rl":"Abbey St","dp":"10:00","e":"16:57","ft":"16:45","fl":"Abbey St","bs":"12:45","bsl":"Abbey St","be":"13:45","bel":"Abbey St","w":6.2,"l":1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/5X","d2":"005075","s":"10:46","rl":"Garage","dp":"10:54","e":"17:42","ft":"17:30","fl":"Abbey St","bs":"13:40","bsl":"Abbey St","be":"14:30","bel":"Abbey St","w":6.1,"l":0.83,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/6X","d2":"005076","s":"10:52","rl":"Garage","dp":"11:00","e":"19:40","ft":"19:40","fl":"Garage","bs":"16:05","bsl":"Townsend St","be":"17:55","bel":"Pearse St","w":6.97,"l":1.83,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/7X","d2":"005077","s":"11:00","rl":"Abbey St","dp":"11:15","e":"18:30","ft":"18:30","fl":"Garage","bs":"14:10","bsl":"Garage","be":"15:25","bel":"Townsend St","w":6.53,"l":0.97,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/8X","d2":"005078","s":"11:12","rl":"Garage","dp":"11:20","e":"20:05","ft":"20:05","fl":"Garage","bs":"16:15","bsl":"Pearse St","be":"18:00","bel":"Abbey St","w":7.13,"l":1.75,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/91","d2":"005091","s":"19:30","rl":"Abbey St","dp":"19:45","e":"27:26","ft":"27:26","fl":"Garage","bs":"21:35","bsl":"Garage","be":"23:50","bel":"Garage","w":5.73,"l":2.2,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/92","d2":"005092","s":"20:15","rl":"Abbey St","dp":"20:30","e":"29:55","ft":"29:55","fl":"Garage","bs":"25:01","bsl":"Garage","be":"26:24","bel":"Garage","w":8.33,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/93","d2":"005093","s":"20:30","rl":"Abbey St","dp":"20:45","e":"29:01","ft":"29:01","fl":"Garage","bs":"23:15","bsl":"Garage","be":"24:54","bel":"Garage","w":6.92,"l":1.6,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/94","d2":"005094","s":"21:36","rl":"Garage","dp":"21:39","e":"29:36","ft":"29:36","fl":"Garage","bs":"26:01","bsl":"Garage","be":"27:24","bel":"Garage","w":6.67,"l":1.33,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/95","d2":"005095","s":"21:51","rl":"Garage","dp":"21:54","e":"30:11","ft":"30:11","fl":"Garage","bs":"23:45","bsl":"Garage","be":"25:54","bel":"Garage","w":6.23,"l":2.1,"b":true},{"z":"Zone 1","t":"sunday","r":"SZ1/96","d2":"005096","s":"22:17","rl":"Garage","dp":"22:20","e":"26:31","ft":"26:31","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":4.23,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/01","d2":"005101","s":"05:42","rl":"Garage","dp":"05:50","e":"11:20","ft":"11:20","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.63,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/02","d2":"005102","s":"05:43","rl":"Garage","dp":"05:51","e":"10:14","ft":"10:05","fl":"PSQE","bs":null,"bsl":null,"be":null,"bel":null,"w":4.52,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/03","d2":"005103","s":"05:52","rl":"Garage","dp":"06:00","e":"14:26","ft":"14:15","fl":"Parnell St","bs":"10:00","bsl":"Garage","be":"11:05","bel":"Garage","w":7.53,"l":1.03,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/04","d2":"005104","s":"05:57","rl":"Garage","dp":"06:05","e":"13:24","ft":"13:15","fl":"PSQE","bs":"08:45","bsl":"PSQE","be":"10:05","bel":"PSQE","w":6.12,"l":1.33,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/05","d2":"005105","s":"05:58","rl":"Garage","dp":"06:06","e":"14:24","ft":"14:15","fl":"PSQE","bs":"10:05","bsl":"Garage","be":"11:20","bel":"PSQE","w":7.33,"l":1.1,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/06","d2":"005106","s":"06:07","rl":"Garage","dp":"06:15","e":"14:56","ft":"14:45","fl":"Parnell St","bs":"10:05","bsl":"Garage","be":"11:45","bel":"Parnell St","w":7.33,"l":1.48,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/07","d2":"005107","s":"06:07","rl":"Garage","dp":"06:15","e":"14:44","ft":"14:35","fl":"PSQE","bs":"10:35","bsl":"PSQE","be":"11:35","bel":"PSQE","w":7.62,"l":1,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/08","d2":"005108","s":"06:12","rl":"Garage","dp":"06:20","e":"15:55","ft":"15:55","fl":"Garage","bs":"09:15","bsl":"Parnell St","be":"11:40","bel":"PSQW","w":7.3,"l":2.42,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/09","d2":"005109","s":"06:13","rl":"Garage","dp":"06:21","e":"11:11","ft":"11:00","fl":"PSQW","bs":null,"bsl":null,"be":null,"bel":null,"w":4.97,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/10","d2":"005110","s":"06:22","rl":"Garage","dp":"06:30","e":"15:51","ft":"15:40","fl":"PSQW","bs":"09:35","bsl":"PSQE","be":"11:00","bel":"PSQE","w":8.07,"l":1.42,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/11","d2":"005111","s":"06:23","rl":"Garage","dp":"06:31","e":"10:45","ft":"10:45","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":4.37,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/12","d2":"005112","s":"06:27","rl":"Garage","dp":"06:35","e":"15:24","ft":"15:15","fl":"PSQE","bs":"09:40","bsl":"Garage","be":"11:00","bel":"PSQW","w":7.8,"l":1.15,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/13","d2":"005113","s":"06:37","rl":"Garage","dp":"06:45","e":"11:51","ft":"11:40","fl":"PSQW","bs":null,"bsl":null,"be":null,"bel":null,"w":5.23,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/14","d2":"005114","s":"06:38","rl":"Garage","dp":"06:46","e":"15:31","ft":"15:20","fl":"PSQW","bs":"09:35","bsl":"Garage","be":"10:35","bel":"PSQE","w":8.03,"l":0.85,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/15","d2":"005115","s":"11:43","rl":"PSQE","dp":"11:55","e":"21:05","ft":"21:05","fl":"Garage","bs":"14:55","bsl":"PSQE","be":"16:30","bel":"Garage","w":7.98,"l":1.38,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/16","d2":"005116","s":"12:01","rl":"Parnell St","dp":"12:15","e":"20:15","ft":"20:15","fl":"Garage","bs":"13:45","bsl":"Parnell St","be":"14:55","bel":"PSQE","w":7.07,"l":1.17,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/17","d2":"005117","s":"12:23","rl":"PSQE","dp":"12:35","e":"22:00","ft":"22:00","fl":"Garage","bs":"17:40","bsl":"PSQW","be":"18:55","bel":"PSQW","w":8.37,"l":1.25,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/18","d2":"005118","s":"13:03","rl":"PSQE","dp":"13:15","e":"22:00","ft":"22:00","fl":"Garage","bs":"16:26","bsl":"PSQE","be":"17:40","bel":"PSQW","w":7.72,"l":1.23,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/19","d2":"005119","s":"13:31","rl":"Parnell St","dp":"13:45","e":"21:19","ft":"21:10","fl":"PSQE","bs":"16:45","bsl":"Parnell St","be":"17:57","bel":"PSQE","w":6.6,"l":1.2,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/20","d2":"005120","s":"14:03","rl":"PSQE","dp":"14:15","e":"22:21","ft":"22:10","fl":"PSQW","bs":"16:00","bsl":"PSQW","be":"17:21","bel":"PSQE","w":6.95,"l":1.35,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/21","d2":"005121","s":"14:20","rl":"Garage","dp":"14:23","e":"21:45","ft":"21:45","fl":"Garage","bs":"15:35","bsl":"PSQE","be":"16:45","bel":"Parnell St","w":6.25,"l":1.17,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/22","d2":"005122","s":"14:44","rl":"Garage","dp":"14:47","e":"24:15","ft":"24:15","fl":"Garage","bs":"19:25","bsl":"PSQE","be":"20:25","bel":"PSQW","w":8.52,"l":1,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/23","d2":"005123","s":"14:45","rl":"Garage","dp":"14:48","e":"24:10","ft":"24:10","fl":"Garage","bs":"17:57","bsl":"PSQE","be":"19:05","bel":"Parnell St","w":8.28,"l":1.13,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/24","d2":"005124","s":"15:03","rl":"PSQE","dp":"15:15","e":"24:20","ft":"24:20","fl":"Garage","bs":"18:40","bsl":"Garage","be":"19:55","bel":"Parnell St","w":8.22,"l":1.07,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/25","d2":"005125","s":"15:16","rl":"Garage","dp":"15:19","e":"20:36","ft":"20:25","fl":"PSQW","bs":null,"bsl":null,"be":null,"bel":null,"w":5.33,"l":0,"b":false},{"z":"Zone 2","t":"weekday","r":"SZ2/26","d2":"005126","s":"15:39","rl":"Garage","dp":"15:42","e":"24:15","ft":"24:15","fl":"Garage","bs":"18:55","bsl":"PSQW","be":"19:45","bel":"PSQE","w":7.77,"l":0.83,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/27","d2":"005127","s":"15:46","rl":"PSQW","dp":"16:00","e":"24:30","ft":"24:30","fl":"Garage","bs":"21:00","bsl":"Garage","be":"22:10","bel":"PSQW","w":7.75,"l":0.98,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/28","d2":"005128","s":"16:03","rl":"Garage","dp":"16:06","e":"24:25","ft":"24:25","fl":"Garage","bs":"17:21","bsl":"PSQE","be":"19:25","bel":"PSQE","w":6.3,"l":2.07,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/29","d2":"005129","s":"16:47","rl":"Garage","dp":"16:50","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:55","bsl":"Parnell St","be":"21:10","bel":"PSQE","w":6.8,"l":1.25,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/1X","d2":"005151","s":"06:39","rl":"Garage","dp":"06:47","e":"18:20","ft":"18:20","fl":"Garage","bs":"11:00","bsl":"PSQE","be":"14:15","bel":"Parnell St","w":8.43,"l":3.25,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/2X","d2":"005152","s":"06:47","rl":"Garage","dp":"06:55","e":"18:40","ft":"18:40","fl":"Garage","bs":"10:45","bsl":"Garage","be":"15:35","bel":"Garage","w":7.1,"l":4.78,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/3X","d2":"005153","s":"06:52","rl":"Garage","dp":"07:00","e":"18:45","ft":"18:45","fl":"Garage","bs":"11:10","bsl":"Garage","be":"15:35","bel":"PSQE","w":7.62,"l":4.27,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/4X","d2":"005154","s":"06:57","rl":"Garage","dp":"07:05","e":"18:50","ft":"18:50","fl":"Garage","bs":"11:20","bsl":"PSQE","be":"15:40","bel":"PSQW","w":7.55,"l":4.33,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/5X","d2":"005155","s":"07:07","rl":"Garage","dp":"07:15","e":"18:55","ft":"18:55","fl":"Garage","bs":"11:55","bsl":"Garage","be":"16:05","bel":"Garage","w":7.68,"l":4.12,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/6X","d2":"005156","s":"07:12","rl":"Garage","dp":"07:20","e":"19:10","ft":"19:10","fl":"Garage","bs":"11:45","bsl":"Parnell St","be":"16:40","bel":"Garage","w":7.28,"l":4.68,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/7X","d2":"005157","s":"07:17","rl":"Garage","dp":"07:25","e":"19:10","ft":"19:10","fl":"Garage","bs":"11:35","bsl":"PSQE","be":"15:04","bel":"Garage","w":8.6,"l":3.28,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/8X","d2":"005158","s":"07:37","rl":"Garage","dp":"07:45","e":"19:16","ft":"19:05","fl":"Parnell St","bs":"10:30","bsl":"Garage","be":"14:45","bel":"Parnell St","w":7.58,"l":4.07,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/9X","d2":"005159","s":"08:02","rl":"Garage","dp":"08:10","e":"19:54","ft":"19:45","fl":"PSQE","bs":"10:50","bsl":"Garage","be":"15:23","bel":"Garage","w":7.37,"l":4.5,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/10X","d2":"005160","s":"08:33","rl":"PSQE","dp":"08:45","e":"19:50","ft":"19:50","fl":"Garage","bs":"11:55","bsl":"PSQE","be":"15:20","bel":"PSQW","w":7.87,"l":3.42,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/11X","d2":"005161","s":"09:01","rl":"Parnell St","dp":"09:15","e":"19:25","ft":"19:25","fl":"Garage","bs":"12:15","bsl":"Parnell St","be":"16:26","bel":"PSQE","w":6.22,"l":4.18,"b":true},{"z":"Zone 2","t":"weekday","r":"SZ2/12X","d2":"005162","s":"09:23","rl":"PSQE","dp":"09:35","e":"19:40","ft":"19:40","fl":"Garage","bs":"12:35","bsl":"PSQE","be":"14:35","bel":"PSQE","w":8.28,"l":2,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/01","d2":"005101","s":"06:16","rl":"Garage","dp":"06:24","e":"13:11","ft":"13:00","fl":"PSQW","bs":"08:45","bsl":"PSQW","be":"09:50","bel":"PSQW","w":5.83,"l":1.08,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/02","d2":"005102","s":"06:17","rl":"Garage","dp":"06:25","e":"14:59","ft":"14:50","fl":"PSQE","bs":"10:10","bsl":"PSQW","be":"11:50","bel":"PSQE","w":7.03,"l":1.67,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/03","d2":"005103","s":"06:22","rl":"Garage","dp":"06:30","e":"14:39","ft":"14:30","fl":"PSQE","bs":"09:15","bsl":"Parnell St","be":"10:10","bel":"PSQW","w":7.37,"l":0.92,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/04","d2":"005104","s":"06:32","rl":"Garage","dp":"06:40","e":"11:59","ft":"11:50","fl":"PSQE","bs":null,"bsl":null,"be":null,"bel":null,"w":5.45,"l":0,"b":false},{"z":"Zone 2","t":"saturday","r":"SZ2/05","d2":"005105","s":"06:37","rl":"Garage","dp":"06:45","e":"15:50","ft":"15:50","fl":"Garage","bs":"11:50","bsl":"PSQW","be":"12:55","bel":"PSQE","w":8.13,"l":1.08,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/06","d2":"005106","s":"06:52","rl":"Garage","dp":"07:00","e":"12:14","ft":"12:05","fl":"PSQE","bs":null,"bsl":null,"be":null,"bel":null,"w":5.37,"l":0,"b":false},{"z":"Zone 2","t":"saturday","r":"SZ2/07","d2":"005107","s":"06:52","rl":"Garage","dp":"07:00","e":"14:11","ft":"14:00","fl":"PSQW","bs":"11:15","bsl":"Parnell St","be":"12:05","bel":"PSQE","w":6.48,"l":0.83,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/08","d2":"005108","s":"06:57","rl":"Garage","dp":"07:05","e":"15:51","ft":"15:40","fl":"PSQW","bs":"11:45","bsl":"Parnell St","be":"12:40","bel":"PSQW","w":7.98,"l":0.92,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/09","d2":"005109","s":"06:57","rl":"Garage","dp":"07:05","e":"12:21","ft":"12:10","fl":"PSQW","bs":null,"bsl":null,"be":null,"bel":null,"w":5.4,"l":0,"b":false},{"z":"Zone 2","t":"saturday","r":"SZ2/10","d2":"005110","s":"11:31","rl":"Parnell St","dp":"11:45","e":"20:45","ft":"20:45","fl":"Garage","bs":"16:15","bsl":"Parnell St","be":"17:50","bel":"PSQW","w":7.65,"l":1.58,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/11","d2":"005111","s":"11:36","rl":"PSQW","dp":"11:50","e":"20:36","ft":"20:25","fl":"PSQW","bs":"16:10","bsl":"PSQE","be":"17:35","bel":"PSQW","w":7.58,"l":1.42,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/12","d2":"005112","s":"11:56","rl":"PSQW","dp":"12:10","e":"21:19","ft":"21:10","fl":"PSQE","bs":"16:35","bsl":"Garage","be":"18:05","bel":"Garage","w":7.93,"l":1.45,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/13","d2":"005113","s":"12:01","rl":"Parnell St","dp":"12:15","e":"21:50","ft":"21:50","fl":"Garage","bs":"15:15","bsl":"Parnell St","be":"17:10","bel":"PSQE","w":7.9,"l":1.92,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/14","d2":"005114","s":"12:46","rl":"PSQW","dp":"13:00","e":"22:30","ft":"22:30","fl":"Garage","bs":"17:10","bsl":"PSQE","be":"18:10","bel":"PSQW","w":8.73,"l":1,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/15","d2":"005115","s":"13:46","rl":"PSQW","dp":"14:00","e":"22:05","ft":"22:05","fl":"Garage","bs":"18:30","bsl":"PSQE","be":"19:25","bel":"PSQW","w":7.4,"l":0.92,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/16","d2":"005116","s":"14:06","rl":"PSQW","dp":"14:20","e":"21:30","ft":"21:30","fl":"Garage","bs":"17:35","bsl":"PSQW","be":"18:30","bel":"PSQE","w":6.48,"l":0.92,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/17","d2":"005117","s":"14:37","rl":"Garage","dp":"14:45","e":"22:19","ft":"22:10","fl":"PSQE","bs":"17:50","bsl":"PSQW","be":"19:20","bel":"Garage","w":6.43,"l":1.27,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/18","d2":"005118","s":"15:01","rl":"Parnell St","dp":"15:15","e":"24:25","ft":"24:25","fl":"Garage","bs":"20:25","bsl":"Garage","be":"21:45","bel":"Garage","w":8.12,"l":1.28,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/19","d2":"005119","s":"15:12","rl":"Garage","dp":"15:20","e":"24:05","ft":"24:05","fl":"Garage","bs":"18:25","bsl":"PSQW","be":"20:00","bel":"Parnell St","w":7.3,"l":1.58,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/20","d2":"005120","s":"15:26","rl":"PSQW","dp":"15:40","e":"24:15","ft":"24:15","fl":"Garage","bs":"18:50","bsl":"PSQW","be":"20:25","bel":"PSQW","w":7.23,"l":1.58,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/21","d2":"005121","s":"15:31","rl":"Parnell St","dp":"15:45","e":"24:00","ft":"24:00","fl":"Garage","bs":"20:00","bsl":"Parnell St","be":"21:10","bel":"PSQE","w":7.32,"l":1.17,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/22","d2":"005122","s":"15:58","rl":"PSQE","dp":"16:10","e":"24:25","ft":"24:25","fl":"Garage","bs":"18:10","bsl":"PSQW","be":"19:15","bel":"Parnell St","w":7.37,"l":1.08,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/23","d2":"005123","s":"16:01","rl":"Parnell St","dp":"16:15","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:15","bsl":"Parnell St","be":"20:55","bel":"Garage","w":7.38,"l":1.43,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/24","d2":"005124","s":"16:12","rl":"Garage","dp":"16:15","e":"24:25","ft":"24:25","fl":"Garage","bs":"18:55","bsl":"Garage","be":"20:20","bel":"Garage","w":6.85,"l":1.37,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/25","d2":"005125","s":"18:11","rl":"PSQW","dp":"18:25","e":"24:50","ft":"24:50","fl":"Garage","bs":"21:10","bsl":"Garage","be":"22:10","bel":"PSQE","w":5.8,"l":0.85,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/1X","d2":"005151","s":"07:17","rl":"Garage","dp":"07:25","e":"15:56","ft":"15:45","fl":"Parnell St","bs":"09:50","bsl":"PSQW","be":"11:15","bel":"Parnell St","w":7.23,"l":1.42,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/2X","d2":"005152","s":"08:31","rl":"PSQW","dp":"08:45","e":"17:45","ft":"17:45","fl":"Garage","bs":"12:55","bsl":"PSQE","be":"14:30","bel":"PSQE","w":7.65,"l":1.58,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/3X","d2":"005153","s":"09:01","rl":"Parnell St","dp":"09:15","e":"19:40","ft":"19:40","fl":"Garage","bs":"12:15","bsl":"Parnell St","be":"14:50","bel":"PSQE","w":8.07,"l":2.58,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/4X","d2":"005154","s":"09:32","rl":"Garage","dp":"09:40","e":"19:36","ft":"19:25","fl":"PSQW","bs":"12:40","bsl":"PSQW","be":"14:55","bel":"Garage","w":8.05,"l":2.02,"b":true},{"z":"Zone 2","t":"saturday","r":"SZ2/5X","d2":"005155","s":"09:37","rl":"Garage","dp":"09:45","e":"19:55","ft":"19:55","fl":"Garage","bs":"14:20","bsl":"PSQW","be":"18:50","bel":"PSQW","w":5.8,"l":4.5,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/01","d2":"005101","s":"07:06","rl":"Garage","dp":"07:14","e":"12:36","ft":"12:25","fl":"PSQW","bs":null,"bsl":null,"be":null,"bel":null,"w":5.5,"l":0,"b":false},{"z":"Zone 2","t":"sunday","r":"SZ2/02","d2":"005102","s":"07:07","rl":"Garage","dp":"07:15","e":"15:49","ft":"15:40","fl":"PSQE","bs":"10:00","bsl":"PSQE","be":"11:40","bel":"Garage","w":7.23,"l":1.47,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/03","d2":"005103","s":"07:37","rl":"Garage","dp":"07:45","e":"14:54","ft":"14:45","fl":"PSQE","bs":"12:10","bsl":"PSQW","be":"13:25","bel":"PSQW","w":6.03,"l":1.25,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/04","d2":"005104","s":"07:52","rl":"Garage","dp":"08:00","e":"13:36","ft":"13:25","fl":"PSQW","bs":null,"bsl":null,"be":null,"bel":null,"w":5.73,"l":0,"b":false},{"z":"Zone 2","t":"sunday","r":"SZ2/05","d2":"005105","s":"08:22","rl":"Garage","dp":"08:30","e":"15:41","ft":"15:30","fl":"PSQW","bs":"11:15","bsl":"PSQW","be":"12:25","bel":"PSQW","w":6.15,"l":1.17,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/06","d2":"005106","s":"08:37","rl":"Garage","dp":"08:45","e":"14:09","ft":"14:00","fl":"PSQE","bs":null,"bsl":null,"be":null,"bel":null,"w":5.53,"l":0,"b":false},{"z":"Zone 2","t":"sunday","r":"SZ2/07","d2":"005107","s":"09:17","rl":"Garage","dp":"09:25","e":"14:55","ft":"14:55","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.63,"l":0,"b":false},{"z":"Zone 2","t":"sunday","r":"SZ2/08","d2":"005108","s":"09:42","rl":"Garage","dp":"09:50","e":"15:10","ft":"15:10","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.47,"l":0,"b":false},{"z":"Zone 2","t":"sunday","r":"SZ2/09","d2":"005109","s":"11:32","rl":"Garage","dp":"11:40","e":"21:15","ft":"21:15","fl":"Garage","bs":"16:10","bsl":"PSQW","be":"18:20","bel":"PSQE","w":7.55,"l":2.17,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/10","d2":"005110","s":"11:56","rl":"PSQW","dp":"12:10","e":"21:41","ft":"21:30","fl":"Parnell St","bs":"16:20","bsl":"PSQE","be":"17:30","bel":"Parnell St","w":8.58,"l":1.17,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/11","d2":"005111","s":"12:12","rl":"Garage","dp":"12:20","e":"21:11","ft":"21:00","fl":"Parnell St","bs":"17:00","bsl":"Parnell St","be":"18:00","bel":"Parnell St","w":7.98,"l":1,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/12","d2":"005112","s":"12:48","rl":"PSQE","dp":"13:00","e":"21:35","ft":"21:35","fl":"Garage","bs":"16:05","bsl":"PSQE","be":"17:00","bel":"Parnell St","w":7.87,"l":0.92,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/13","d2":"005113","s":"13:12","rl":"Garage","dp":"13:20","e":"22:05","ft":"22:05","fl":"Garage","bs":"17:30","bsl":"Parnell St","be":"18:25","bel":"PSQW","w":7.97,"l":0.92,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/14","d2":"005114","s":"13:31","rl":"PSQW","dp":"13:45","e":"20:50","ft":"20:50","fl":"Garage","bs":"15:00","bsl":"PSQE","be":"16:20","bel":"PSQE","w":5.98,"l":1.33,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/15","d2":"005115","s":"14:33","rl":"PSQE","dp":"14:45","e":"22:45","ft":"22:45","fl":"Garage","bs":"19:20","bsl":"PSQW","be":"20:20","bel":"PSQW","w":7.2,"l":1,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/16","d2":"005116","s":"14:42","rl":"Garage","dp":"14:50","e":"24:10","ft":"24:10","fl":"Garage","bs":"18:00","bsl":"Parnell St","be":"19:00","bel":"PSQE","w":8.47,"l":1,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/17","d2":"005117","s":"14:48","rl":"PSQE","dp":"15:00","e":"24:05","ft":"24:05","fl":"Garage","bs":"19:45","bsl":"PSQW","be":"21:00","bel":"Parnell St","w":8.03,"l":1.25,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/18","d2":"005118","s":"15:08","rl":"PSQE","dp":"15:20","e":"24:50","ft":"24:50","fl":"Garage","bs":"18:20","bsl":"PSQE","be":"19:45","bel":"PSQW","w":8.28,"l":1.42,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/19","d2":"005119","s":"15:16","rl":"PSQW","dp":"15:30","e":"24:10","ft":"24:10","fl":"Garage","bs":"18:25","bsl":"PSQW","be":"19:20","bel":"PSQW","w":7.98,"l":0.92,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/20","d2":"005120","s":"15:28","rl":"PSQE","dp":"15:40","e":"24:20","ft":"24:20","fl":"Garage","bs":"20:20","bsl":"PSQW","be":"21:30","bel":"Parnell St","w":7.7,"l":1.17,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/21","d2":"005121","s":"15:53","rl":"PSQE","dp":"16:05","e":"24:30","ft":"24:30","fl":"Garage","bs":"19:00","bsl":"PSQE","be":"19:55","bel":"PSQE","w":7.7,"l":0.92,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/1X","d2":"005151","s":"09:48","rl":"PSQE","dp":"10:00","e":"16:01","ft":"15:50","fl":"PSQW","bs":"13:00","bsl":"PSQE","be":"14:00","bel":"PSQE","w":5.22,"l":1,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/2X","d2":"005152","s":"10:52","rl":"Garage","dp":"11:00","e":"20:04","ft":"19:55","fl":"PSQE","bs":"13:45","bsl":"PSQW","be":"15:50","bel":"PSQW","w":7.12,"l":2.08,"b":true},{"z":"Zone 2","t":"sunday","r":"SZ2/3X","d2":"005153","s":"11:01","rl":"PSQW","dp":"11:15","e":"20:10","ft":"20:10","fl":"Garage","bs":"15:20","bsl":"PSQE","be":"16:10","bel":"PSQW","w":8.32,"l":0.83,"b":true},{"z":"Skerries","t":"weekday","r":"33SK/01","d2":"201","s":"05:27","rl":"Sk Gar","dp":"05:35","e":"09:30","ft":null,"fl":"Sk Gar","bs":null,"bsl":null,"be":null,"bel":null,"w":4.05,"l":0,"b":false},{"z":"Skerries","t":"weekday","r":"33SK/02","d2":"202","s":"06:12","rl":"Sk Gar","dp":"06:20","e":"15:35","ft":null,"fl":"Sk Gar","bs":"09:20","bsl":"Sk Gar","be":"10:23","bel":"Sk Gar","w":8.33,"l":1.05,"b":true},{"z":"Skerries","t":"weekday","r":"33SK/03","d2":"203","s":"07:17","rl":"Sk Gar","dp":"07:25","e":"12:25","ft":null,"fl":"Sk Gar","bs":null,"bsl":null,"be":null,"bel":null,"w":5.13,"l":0,"b":false},{"z":"Skerries","t":"weekday","r":"33SK/04","d2":"204","s":"11:53","rl":"Sk Gar","dp":"11:56","e":"21:30","ft":null,"fl":"Sk Gar","bs":"14:40","bsl":"Sk Gar","be":"16:22","bel":"Skerries","w":7.92,"l":1.7,"b":true},{"z":"Skerries","t":"weekday","r":"33SK/05","d2":"205","s":"14:47","rl":"Sk Gar","dp":"14:50","e":"24:10","ft":null,"fl":"Sk Gar","bs":"19:10","bsl":"Sk Gar","be":"20:12","bel":"Sk Gar","w":8.35,"l":1.03,"b":true},{"z":"Skerries","t":"weekday","r":"33SK/06","d2":"206","s":"16:23","rl":"Sk Gar","dp":"16:26","e":"25:05","ft":null,"fl":"Sk Gar","bs":"20:20","bsl":"Sk Gar","be":"21:26","bel":"Sk Gar","w":7.6,"l":1.1,"b":true},{"z":"Skerries","t":"weekday","r":"33SK/1X","d2":"211","s":"06:42","rl":"Sk Gar","dp":"06:50","e":"16:25","ft":null,"fl":"Sk Gar","bs":"09:45","bsl":"Sk Gar","be":"12:23","bel":"Sk Gar","w":7.08,"l":2.63,"b":true},{"z":"Skerries","t":"weekday","r":"33SK/2X","d2":"212","s":"09:17","rl":"Sk Gar","dp":"09:25","e":"19:55","ft":null,"fl":"Sk Gar","bs":"12:50","bsl":"Sk Gar","be":"16:27","bel":"Sk Gar","w":7.02,"l":3.62,"b":true},{"z":"Skerries","t":"saturday","r":"33SK/01","d2":"201","s":"05:22","rl":"Sk Gar","dp":"05:30","e":"09:51","ft":null,"fl":"Sk Yrd","bs":null,"bsl":null,"be":null,"bel":null,"w":4.48,"l":0,"b":false},{"z":"Skerries","t":"saturday","r":"33SK/02","d2":"202","s":"06:26","rl":"Sk Gar","dp":"06:34","e":"15:18","ft":null,"fl":"Sk Gar","bs":"10:58","bsl":"Sk Stn","be":"12:31","bel":"Sk Stn","w":7.32,"l":1.55,"b":true},{"z":"Skerries","t":"saturday","r":"33SK/03","d2":"203","s":"12:18","rl":"Sk Gar","dp":"12:26","e":"21:42","ft":null,"fl":"Sk Gar","bs":"16:57","bsl":"Sk Stn","be":"18:00","bel":"Sk Stn","w":8.35,"l":1.05,"b":true},{"z":"Skerries","t":"saturday","r":"33SK/04","d2":"204","s":"15:23","rl":"Sk Gar","dp":"15:26","e":"25:00","ft":null,"fl":"Sk Gar","bs":"20:00","bsl":"Sk Stn","be":"21:31","bel":"Sk Stn","w":8.1,"l":1.52,"b":true},{"z":"Skerries","t":"saturday","r":"33SK/1X","d2":"211","s":"08:07","rl":"Sk Gar","dp":"08:15","e":"17:14","ft":null,"fl":"Sk Gar","bs":"12:27","bsl":"Sk Stn","be":"13:53","bel":"Sk Stn","w":7.68,"l":1.43,"b":true},{"z":"Skerries","t":"saturday","r":"33SK/2X","d2":"212","s":"09:48","rl":"Sk Yrd","dp":"09:51","e":"19:50","ft":null,"fl":"Sk Gar","bs":"13:52","bsl":"Sk Yrd","be":"16:55","bel":"Sk Stn","w":6.98,"l":3.05,"b":true},{"z":"Skerries","t":"sunday","r":"33SK/01","d2":"201","s":"07:17","rl":"Sk Gar","dp":"07:29","e":"12:54","ft":null,"fl":null,"bs":null,"bsl":null,"be":null,"bel":null,"w":5.62,"l":0,"b":false},{"z":"Skerries","t":"sunday","r":"33SK/02","d2":"202","s":"07:28","rl":"Sk Gar","dp":"07:40","e":"13:13","ft":null,"fl":null,"bs":null,"bsl":null,"be":null,"bel":null,"w":5.75,"l":0,"b":false},{"z":"Skerries","t":"sunday","r":"33SK/03","d2":"203","s":"12:58","rl":"Sk Yrd","dp":"13:10","e":"21:38","ft":null,"fl":"Sk Gar","bs":"17:00","bsl":"Sk Stn","be":"18:24","bel":"Sk Stn","w":7.27,"l":1.4,"b":true},{"z":"Skerries","t":"sunday","r":"33SK/04","d2":"204","s":"15:14","rl":"Sk Gar","dp":"15:26","e":"25:08","ft":null,"fl":"Sk Gar","bs":"20:08","bsl":"Sk Stn","be":"21:24","bel":"Sk Stn","w":8.63,"l":1.27,"b":true},{"z":"Skerries","t":"sunday","r":"33SK/05","d2":"205","s":"15:17","rl":"Sk Gar","dp":"15:24","e":"24:24","ft":null,"fl":"Sk Gar","bs":"18:28","bsl":"Sk Stn","be":"19:54","bel":"Sk Stn","w":7.68,"l":1.43,"b":true},{"z":"Skerries","t":"sunday","r":"33SK/1X","d2":"211","s":"10:49","rl":"Sk Gar","dp":"11:01","e":"19:43","ft":null,"fl":"Sk Gar","bs":"15:18","bsl":"Sk Yrd","be":"16:52","bel":"Sk Yrd","w":7.33,"l":1.57,"b":true},{"z":"Skerries","t":"sunday","r":"33SK/2X","d2":"212","s":"12:39","rl":"Sk Yrd","dp":"12:51","e":"21:28","ft":null,"fl":"Sk Gar","bs":"16:48","bsl":"Sk Stn","be":"18:30","bel":"Sk Stn","w":7.12,"l":1.7,"b":true},{"z":"150","t":"weekday","r":"150/01","d2":"005251","s":"05:32","rl":"Garage","dp":"05:40","e":"11:10","ft":"11:10","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.63,"l":0,"b":false},{"z":"150","t":"weekday","r":"150/02","d2":"005252","s":"05:52","rl":"Garage","dp":"06:00","e":"13:20","ft":"13:20","fl":"Garage","bs":"09:50","bsl":"Garage","be":"11:10","bel":"Hawkins St","w":6.42,"l":1.05,"b":true},{"z":"150","t":"weekday","r":"150/03","d2":"005253","s":"06:07","rl":"Garage","dp":"06:15","e":"13:47","ft":"13:30","fl":"Hawkins St","bs":"08:40","bsl":"Hawkins St","be":"09:50","bel":"Hawkins St","w":6.5,"l":1.17,"b":true},{"z":"150","t":"weekday","r":"150/04","d2":"005254","s":"06:12","rl":"Garage","dp":"06:20","e":"12:07","ft":"11:50","fl":"Hawkins St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.92,"l":0,"b":false},{"z":"150","t":"weekday","r":"150/05","d2":"005255","s":"06:17","rl":"Garage","dp":"06:25","e":"14:47","ft":"14:30","fl":"Hawkins St","bs":"10:50","bsl":"Garage","be":"12:10","bel":"Hawkins St","w":7.45,"l":1.05,"b":true},{"z":"150","t":"weekday","r":"150/06","d2":"005256","s":"06:27","rl":"Garage","dp":"06:35","e":"15:27","ft":"15:10","fl":"Hawkins St","bs":"11:30","bsl":"Garage","be":"12:50","bel":"Hawkins St","w":7.95,"l":1.05,"b":true},{"z":"150","t":"weekday","r":"150/07","d2":"005257","s":"11:30","rl":"Hawkins St","dp":"11:50","e":"21:17","ft":"21:00","fl":"Hawkins St","bs":"16:10","bsl":"Hawkins St","be":"17:10","bel":"Hawkins St","w":8.78,"l":1,"b":true},{"z":"150","t":"weekday","r":"150/08","d2":"005258","s":"11:32","rl":"Garage","dp":"11:35","e":"20:30","ft":"20:30","fl":"Garage","bs":"15:30","bsl":"Hawkins St","be":"16:25","bel":"Hawkins St","w":8.05,"l":0.92,"b":true},{"z":"150","t":"weekday","r":"150/09","d2":"005259","s":"12:07","rl":"Garage","dp":"12:10","e":"21:55","ft":"21:55","fl":"Garage","bs":"17:10","bsl":"Hawkins St","be":"18:10","bel":"Hawkins St","w":8.8,"l":1,"b":true},{"z":"150","t":"weekday","r":"150/10","d2":"005260","s":"13:10","rl":"Hawkins St","dp":"13:30","e":"21:47","ft":"21:30","fl":"Hawkins St","bs":"18:10","bsl":"Hawkins St","be":"19:35","bel":"Hawkins St","w":7.2,"l":1.42,"b":true},{"z":"150","t":"weekday","r":"150/11","d2":"005261","s":"15:10","rl":"Hawkins St","dp":"15:30","e":"24:20","ft":"24:20","fl":"Garage","bs":"19:45","bsl":"Garage","be":"21:00","bel":"Hawkins St","w":8.2,"l":0.97,"b":true},{"z":"150","t":"weekday","r":"150/12","d2":"005262","s":"15:47","rl":"Garage","dp":"15:50","e":"24:20","ft":"24:20","fl":"Garage","bs":"20:30","bsl":"Hawkins St","be":"21:30","bel":"Hawkins St","w":7.55,"l":1,"b":true},{"z":"150","t":"weekday","r":"150/13","d2":"005263","s":"16:17","rl":"Garage","dp":"16:20","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:15","bsl":"Garage","be":"20:30","bel":"Hawkins St","w":7.58,"l":0.97,"b":true},{"z":"150","t":"weekday","r":"150/1X","d2":"005271","s":"06:52","rl":"Garage","dp":"07:00","e":"16:45","ft":"16:45","fl":"Garage","bs":"11:10","bsl":"Hawkins St","be":"13:50","bel":"Garage","w":7.55,"l":2.33,"b":true},{"z":"150","t":"weekday","r":"150/2X","d2":"005272","s":"07:37","rl":"Garage","dp":"07:45","e":"18:50","ft":"18:50","fl":"Garage","bs":"09:50","bsl":"Hawkins St","be":"14:30","bel":"Hawkins St","w":6.55,"l":4.67,"b":true},{"z":"150","t":"weekday","r":"150/3X","d2":"005273","s":"07:42","rl":"Garage","dp":"07:50","e":"19:20","ft":"19:20","fl":"Garage","bs":"12:10","bsl":"Hawkins St","be":"15:10","bel":"Hawkins St","w":8.63,"l":3,"b":true},{"z":"150","t":"weekday","r":"150/4X","d2":"005274","s":"08:20","rl":"Hawkins St","dp":"08:40","e":"19:52","ft":"19:35","fl":"Hawkins St","bs":"12:50","bsl":"Hawkins St","be":"17:15","bel":"Garage","w":7.45,"l":4.08,"b":true},{"z":"150","t":"saturday","r":"150/01","d2":"5251","s":"06:12","rl":"Garage","dp":"06:20","e":"11:15","ft":"11:15","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":5.05,"l":0,"b":false},{"z":"150","t":"saturday","r":"150/02","d2":"5252","s":"06:22","rl":"Garage","dp":"06:30","e":"15:12","ft":"14:55","fl":"Hawkins St","bs":"09:45","bsl":"Hawkins St","be":"11:20","bel":"Garage","w":7.58,"l":1.25,"b":true},{"z":"150","t":"saturday","r":"150/03","d2":"5253","s":"06:52","rl":"Garage","dp":"07:00","e":"15:52","ft":"15:35","fl":"Hawkins St","bs":"10:45","bsl":"Hawkins St","be":"13:35","bel":"Hawkins St","w":6.17,"l":2.83,"b":true},{"z":"150","t":"saturday","r":"150/04","d2":"5254","s":"09:25","rl":"Hawkins St","dp":"09:45","e":"17:32","ft":"17:15","fl":"Hawkins St","bs":"13:35","bsl":"Hawkins St","be":"15:15","bel":"Hawkins St","w":6.45,"l":1.67,"b":true},{"z":"150","t":"saturday","r":"150/05","d2":"5255","s":"11:52","rl":"Garage","dp":"11:55","e":"20:35","ft":"20:35","fl":"Garage","bs":"16:15","bsl":"Hawkins St","be":"17:15","bel":"Hawkins St","w":7.72,"l":1,"b":true},{"z":"150","t":"saturday","r":"150/06","d2":"5256","s":"12:15","rl":"Hawkins St","dp":"12:35","e":"21:47","ft":"21:30","fl":"Hawkins St","bs":"16:35","bsl":"Hawkins St","be":"18:15","bel":"Hawkins St","w":7.87,"l":1.67,"b":true},{"z":"150","t":"saturday","r":"150/07","d2":"5257","s":"15:15","rl":"Hawkins St","dp":"15:35","e":"24:55","ft":"24:55","fl":"Garage","bs":"19:30","bsl":"Hawkins St","be":"20:30","bel":"Hawkins St","w":8.67,"l":1,"b":true},{"z":"150","t":"saturday","r":"150/08","d2":"5258","s":"15:55","rl":"Hawkins St","dp":"16:15","e":"24:20","ft":"24:20","fl":"Garage","bs":"18:15","bsl":"Hawkins St","be":"19:30","bel":"Hawkins St","w":7.17,"l":1.25,"b":true},{"z":"150","t":"saturday","r":"150/09","d2":"5259","s":"16:15","rl":"Hawkins St","dp":"16:35","e":"24:25","ft":"24:25","fl":"Garage","bs":"20:30","bsl":"Hawkins St","be":"21:30","bel":"Hawkins St","w":7.17,"l":1,"b":true},{"z":"150","t":"saturday","r":"150/1X","d2":"5271","s":"09:47","rl":"Garage","dp":"09:55","e":"19:15","ft":"19:15","fl":"Garage","bs":"13:55","bsl":"Hawkins St","be":"14:55","bel":"Hawkins St","w":8.47,"l":1,"b":true},{"z":"150","t":"saturday","r":"150/2X","d2":"5272","s":"10:25","rl":"Hawkins St","dp":"10:45","e":"18:12","ft":"17:55","fl":"Hawkins St","bs":"12:35","bsl":"Hawkins St","be":"13:55","bel":"Hawkins St","w":6.45,"l":1.33,"b":true},{"z":"150","t":"saturday","r":"150/3X","d2":"5273","s":"10:47","rl":"Garage","dp":"10:55","e":"20:00","ft":"20:00","fl":"Garage","bs":"15:15","bsl":"Hawkins St","be":"17:55","bel":"Hawkins St","w":6.55,"l":2.67,"b":true},{"z":"150","t":"sunday","r":"150/01","d2":"5251","s":"07:27","rl":"Garage","dp":"07:35","e":"12:17","ft":"12:00","fl":"Hawkins St","bs":null,"bsl":null,"be":null,"bel":null,"w":4.83,"l":0,"b":false},{"z":"150","t":"sunday","r":"150/02","d2":"5252","s":"07:52","rl":"Garage","dp":"08:00","e":"12:40","ft":"12:40","fl":"Garage","bs":null,"bsl":null,"be":null,"bel":null,"w":4.8,"l":0,"b":false},{"z":"150","t":"sunday","r":"150/03","d2":"5253","s":"08:02","rl":"Garage","dp":"08:10","e":"13:47","ft":"13:30","fl":"Hawkins St","bs":null,"bsl":null,"be":null,"bel":null,"w":5.75,"l":0,"b":false},{"z":"150","t":"sunday","r":"150/04","d2":"5254","s":"13:10","rl":"Hawkins St","dp":"13:30","e":"20:47","ft":"20:30","fl":"Hawkins St","bs":"17:30","bsl":"Hawkins St","be":"18:30","bel":"Hawkins St","w":6.62,"l":1,"b":true},{"z":"150","t":"sunday","r":"150/05","d2":"5255","s":"14:40","rl":"Hawkins St","dp":"15:00","e":"24:15","ft":"24:15","fl":"Garage","bs":"17:00","bsl":"Hawkins St","be":"19:30","bel":"Hawkins St","w":7.08,"l":2.5,"b":true},{"z":"150","t":"sunday","r":"150/06","d2":"5256","s":"16:10","rl":"Hawkins St","dp":"16:30","e":"24:20","ft":"24:20","fl":"Garage","bs":"18:30","bsl":"Hawkins St","be":"20:00","bel":"Hawkins St","w":6.67,"l":1.5,"b":true},{"z":"150","t":"sunday","r":"150/07","d2":"5257","s":"17:10","rl":"Hawkins St","dp":"17:30","e":"24:50","ft":"24:50","fl":"Garage","bs":"19:30","bsl":"Hawkins St","be":"20:30","bel":"Hawkins St","w":6.67,"l":1,"b":true},{"z":"150","t":"sunday","r":"150/1X","d2":"5271","s":"11:17","rl":"Garage","dp":"11:25","e":"18:17","ft":"18:00","fl":"Hawkins St","bs":"15:00","bsl":"Hawkins St","be":"16:00","bel":"Hawkins St","w":6,"l":1,"b":true},{"z":"150","t":"sunday","r":"150/2X","d2":"5272","s":"11:40","rl":"Hawkins St","dp":"12:00","e":"20:45","ft":"20:45","fl":"Garage","bs":"16:00","bsl":"Hawkins St","be":"17:00","bel":"Hawkins St","w":8.08,"l":1,"b":true},{"z":"150","t":"sunday","r":"150/3X","d2":"5273","s":"12:07","rl":"Garage","dp":"12:15","e":"20:17","ft":"20:00","fl":"Hawkins St","bs":"16:30","bsl":"Hawkins St","be":"18:00","bel":"Hawkins St","w":6.67,"l":1.5,"b":true}];

let SEQ={"Z1|SU|070":["09:30 - Abbey St (41)","10:45 - Swords Manor (41)","12:00 - Abbey St (Break)","13:24 - Report (Garage)","13:30 - Abbey St (41)","15:00 - Swords Manor (41C)","16:30 - Abbey St (41)","17:50 - Special to Garage","18:30 - Garage (Finish)"],"Z1|SU|069":["09:12 - Report (Garage)","10:00 - Swords Manor (41C)","11:30 - Abbey St (41)","12:45 - Swords Manor (41)","14:10 - Special to Garage","14:20 - Garage (Break)","16:10 - Pearse St (15A)","17:00 - Limekiln Rd (15A)","18:02 - Townsend St (Finish)"],"Z1|SU|068":["09:11 - Report (Garage)","10:00 - Limekiln Rd (15A)","11:00 - Merrion Sq (15A)","11:10 - Pearse St (Break)","12:20 - Townsend St (15A)","12:30 - Merrion Sq (15A)","13:30 - Limekiln Rd (15A)","14:30 - Merrion Sq (15A)","15:30 - Limekiln Rd (15A)","16:37 - Townsend St (Finish)"],"Z1|SA|073":["09:25 - Abbey St (41)","10:40 - Swords Manor (41)","12:05 - Abbey St (Break)","13:25 - Townsend St (15A)","13:45 - Merrion Sq (15B)","15:00 - Stocking Ave (15B)","16:15 - Merrion Sq (15B)","17:30 - Stocking Ave (15B)","18:52 - Townsend St (Finish)"],"Z1|SA|072":["09:00 - Pearse St (15A)","09:50 - Limekiln Rd (15A)","10:45 - Merrion Sq (15B)","12:00 - Stocking Ave (15B)","13:05 - Townsend St (Break)","14:15 - Abbey St (41)","15:50 - Swords Manor (41C)","17:27 - Abbey St (Finish)"],"Z1|SA|071":["08:45 - Abbey St (41C)","10:00 - Swords Manor (41)","11:25 - Abbey St (Break)","13:10 - Pearse St (15B)","14:15 - Stocking Ave (15B)","15:30 - Merrion Sq (15B)","16:45 - Stocking Ave (15B)","18:07 - Townsend St (Finish)"],"Z2|W|101":["05:42 - Report (Garage)","06:30 - Drimnagh Rd (122)","07:45 - Ashington (122)","09:20 - Drimnagh Rd (122)","10:55 - Spl to Garage (from Ashington)","11:20 - Garage (Finish)"],"Z2|W|102":["05:43 - Report (Garage)","06:15 - Ashington (122)","07:40 - Drimnagh Rd (122)","09:25 - Ashington (122)","10:14 - Parnell Sq-E (Finish)"],"Z2|W|103":["05:52 - Report (Garage)","06:30 - Ashtown (120)","07:15 - Parnell St (120)","08:00 - Ashtown (to Ballsbridge (RDS)) (120)","09:20 - Spl to Garage (from Ballsbridge)","10:00 - Garage (Break)","11:05 - Report (Garage)","11:15 - Parnell St (120)","12:00 - Ashtown (120)","12:45 - Parnell St (120)","13:30 - Ashtown (120)","14:26 - Parnell St (Finish)"],"Z2|W|104":["05:57 - Report (Garage)","06:45 - Drimnagh Rd (122)","08:05 - Ashington (122)","08:45 - Parnell Sq-E (Break)","10:05 - Parnell Sq-E (122)","11:10 - Drimnagh Rd (122)","12:40 - Ashington (122)","13:24 - Parnell Sq-E (Finish)"],"Z2|W|105":["05:58 - Report (Garage)","06:30 - Ashington (122)","07:50 - Drimnagh Rd (122)","09:30 - Spl to Garage (from Ashington)","10:05 - Garage (Break)","11:20 - Parnell Sq-E (122)","12:10 - Drimnagh Rd (122)","13:40 - Ashington (122)","14:24 - Parnell Sq-E (Finish)"],"Z2|W|106":["06:07 - Report (Garage)","06:45 - Ashtown (120)","07:30 - Parnell St (120)","08:15 - Ashtown (to Ballsbridge (RDS)) (120)","09:30 - Spl to Garage (from Ballsbridge)","10:05 - Garage (Break)","11:45 - Parnell St (120)","12:30 - Ashtown (120)","13:15 - Parnell St (120)","14:00 - Ashtown (120)","14:56 - Parnell St (Finish)"],"Z2|W|107":["06:07 - Report (Garage)","06:45 - Ashington (122)","08:10 - Drimnagh Rd (122)","10:00 - Ashington (122)","10:35 - Parnell Sq-E (Break)","11:35 - Parnell Sq-E (122)","12:30 - Drimnagh Rd (122)","14:00 - Ashington (122)","14:44 - Parnell Sq-E (Finish)"],"Z2|W|108":["06:12 - Report (Garage)","06:30 - Parnell St (120)","07:00 - Ashtown (120)","07:45 - Parnell St (120)","08:30 - Ashtown (120)","09:15 - Parnell St (Break)","11:40 - Parnell Sq-W (122)","12:20 - Ashington (122)","13:50 - Drimnagh Rd (122)","15:30 - Spl to Garage (from Ashington)","15:55 - Garage (Finish)"],"Z2|W|109":["06:13 - Report (Garage)","07:00 - Drimnagh Rd (122)","08:25 - Ashington (122)","10:10 - Drimnagh Rd (122)","11:11 - Parnell Sq-W (Finish)"],"Z2|W|110":["06:22 - Report (Garage)","07:15 - Drimnagh Rd (122)","08:55 - Ashington (122)","09:35 - Parnell Sq-E (Break)","11:00 - Parnell Sq-E (122)","11:50 - Drimnagh Rd (122)","13:20 - Ashington (122)","14:50 - Drimnagh Rd (122)","15:51 - Parnell Sq-W (Finish)"],"Z2|W|111":["06:23 - Report (Garage)","07:00 - Ashington (122)","08:20 - Drimnagh Rd (122)","10:15 - Spl to Garage (from Ashington)","10:45 - Garage (Finish)"],"Z2|W|112":["06:27 - Report (Garage)","07:15 - Ashtown (120)","08:00 - Parnell St (120)","08:45 - Ashtown (120)","09:30 - Spl to Garage (from Parnell St)","09:40 - Garage (Break)","11:00 - Parnell Sq-W (122)","11:40 - Ashington (122)","13:10 - Drimnagh Rd (122)","14:40 - Ashington (122)","15:24 - Parnell Sq-E (Finish)"],"Z2|W|113":["06:37 - Report (Garage)","07:30 - Drimnagh Rd (122)","09:10 - Ashington (122)","10:50 - Drimnagh Rd (122)","11:51 - Parnell Sq-W (Finish)"],"Z2|W|114":["06:38 - Report (Garage)","07:00 - Parnell St (120)","07:40 - Ashtown (to Ballsbridge (RDS)) (120)","08:55 - Spl to Garage (from Ballsbridge)","09:35 - Garage (Break)","10:35 - Parnell Sq-E (122)","11:30 - Drimnagh Rd (122)","13:00 - Ashington (122)","14:30 - Drimnagh Rd (122)","15:31 - Parnell Sq-W (Finish)"],"Z2|W|115":["11:55 - Parnell Sq-E (122)","12:50 - Drimnagh Rd (122)","14:20 - Ashington (122)","14:55 - Parnell Sq-E (Break)","16:30 - Report (Garage)","17:10 - Ashington (122)","19:00 - Drimnagh Rd (122)","20:35 - Spl to Garage (from Ashington)","21:05 - Garage (Finish)"],"Z2|W|116":["12:15 - Parnell St (120)","13:00 - Ashtown (120)","13:45 - Parnell St (Break)","14:55 - Parnell Sq-E (122)","15:52 - Drimnagh Rd (122)","17:50 - Ashington (122)","19:30 - Spl to Garage (from Drimnagh Rd)","20:15 - Garage (Finish)"],"Z2|W|117":["12:35 - Parnell Sq-E (122)","13:30 - Drimnagh Rd (122)","15:10 - Ashington (122)","16:40 - Drimnagh Rd (122)","17:40 - Parnell Sq-W (Break)","18:55 - Parnell Sq-W (122)","19:45 - Ashington (122)","21:20 - Spl to Garage (from Drimnagh Rd)","22:00 - Garage (Finish)"],"Z2|W|118":["13:15 - Parnell Sq-E (122)","14:10 - Drimnagh Rd (122)","15:46 - Ashington (122)","16:26 - Parnell Sq-E (Break)","17:40 - Parnell Sq-W (122)","18:30 - Ashington (122)","20:05 - Drimnagh Rd (122)","21:20 - Spl to Garage (from Ashington)","22:00 - Garage (Finish)"],"Z2|W|119":["13:45 - Parnell St (120)","14:30 - Ashtown (120)","15:15 - Parnell St (120)","16:00 - Ashtown (120)","16:45 - Parnell St (Break)","17:57 - Parnell Sq-E (122)","19:20 - Drimnagh Rd (122)","20:45 - Ashington (122)","21:19 - Parnell Sq-E (Finish)"],"Z2|W|120":["14:15 - Parnell Sq-E (122)","15:10 - Drimnagh Rd (122)","16:00 - Parnell Sq-W (Break)","17:21 - Parnell Sq-E (122)","18:20 - Drimnagh Rd (122)","20:15 - Ashington (122)","21:30 - Drimnagh Rd (122)","22:21 - Parnell Sq-W (Finish)"],"Z2|W|121":["14:20 - Report (Garage)","14:58 - Ashington (122)","15:35 - Parnell Sq-E (Break)","16:45 - Parnell St (120)","17:30 - Ashtown (120)","18:05 - Parnell St (120)","18:50 - Ashtown (120)","19:30 - Parnell St (120)","20:15 - Ashtown (120)","20:45 - Parnell St (120)","21:15 - Spl to Garage (from Ashtown)","21:45 - Garage (Finish)"],"Z2|W|122":["14:44 - Report (Garage)","15:22 - Ashington (122)","16:52 - Drimnagh Rd (122)","18:50 - Ashington (122)","19:25 - Parnell Sq-E (Break)","20:25 - Parnell Sq-W (122)","21:15 - Ashington (122)","22:30 - Drimnagh Rd (122)","23:30 - Ashington (to Psq-E) (122)","00:05 - Spl to Garage (from Psq-E)","00:15 - Garage (Finish)"],"Z2|W|123":["14:45 - Report (Garage)","15:28 - Drimnagh Rd (122)","17:22 - Ashington (122)","17:57 - Parnell Sq-E (Break)","19:05 - Parnell St (120)","19:45 - Ashtown (120)","20:20 - Parnell St (120)","21:15 - Ashtown (120)","21:45 - Parnell St (120)","22:15 - Ashtown (120)","22:55 - Parnell St (120)","23:30 - Ashtown (120)","00:00 - Spl to Garage (from Parnell St)","00:10 - Garage (Finish)"],"Z2|W|124":["15:15 - Parnell Sq-E (122)","16:16 - Drimnagh Rd (122)","18:05 - Spl to Garage (from Ashington)","18:40 - Garage (Break)","19:55 - Parnell St (120)","20:45 - Ashtown (120)","21:15 - Parnell St (120)","21:45 - Ashtown (120)","22:15 - Parnell St (120)","22:55 - Ashtown (120)","23:30 - Parnell St (120)","00:00 - Spl to Garage (from Ashtown)","00:20 - Garage (Finish)"],"Z2|W|125":["15:16 - Report (Garage)","16:04 - Drimnagh Rd (122)","18:10 - Ashington (122)","19:40 - Drimnagh Rd (122)","20:36 - Parnell Sq-W (Finish)"],"Z2|W|126":["15:39 - Report (Garage)","16:22 - Ashington (122)","18:00 - Drimnagh Rd (122)","18:55 - Parnell Sq-W (Break)","19:45 - Parnell Sq-E (122)","21:00 - Drimnagh Rd (122)","22:15 - Ashington (122)","23:30 - Drimnagh Rd (to Psq-W) (122)","00:05 - Spl to Garage (from Psq-W)","00:15 - Garage (Finish)"],"Z2|W|127":["16:00 - Parnell Sq-W (122)","16:58 - Ashington (122)","18:40 - Drimnagh Rd (122)","20:20 - Spl to Garage (from Ashington)","21:00 - Garage (Break)","22:10 - Parnell Sq-W (122)","22:45 - Ashington (122)","23:55 - Spl to Garage (from Drimnagh Rd)","00:30 - Garage (Finish)"],"Z2|W|128":["16:03 - Report (Garage)","16:46 - Ashington (122)","17:21 - Parnell Sq-E (Break)","19:25 - Parnell Sq-E (122)","20:30 - Drimnagh Rd (122)","21:45 - Ashington (122)","23:00 - Drimnagh Rd (122) ( !","23:30 - O'Connell St (122) )","00:00 - Spl to Garage (from Ashington)","00:25 - Garage (Finish)"],"Z2|W|129":["16:47 - Report (Garage)","17:00 - Parnell St (120)","17:45 - Ashtown (120)","18:35 - Parnell St (120)","19:15 - Ashtown (120)","19:55 - Parnell St (Break)","21:10 - Parnell Sq-E (122)","22:00 - Drimnagh Rd (122)","23:10 - Ashington (122) ( !","23:30 - O'Connell St (122) )","00:10 - Spl to Garage (from Drimnagh Rd)","00:50 - Garage (Finish)"],"Z2|W|151":["06:39 - Report (Garage)","07:15 - Ashington (122)","08:35 - Drimnagh Rd (122)","10:20 - Ashington (122)","11:00 - Parnell Sq-E (Break)","14:15 - Parnell St (120)","15:00 - Ashtown (120)","15:45 - Special to Ballsbridge (RDS)","16:40 - Ballsbridge (from RDS to Ashtown)","17:50 - Spl to Garage (from Ashtown)","18:20 - Garage (Finish)"],"Z2|W|152":["06:47 - Report (Garage)","07:25 - Ashington (122)","08:50 - Drimnagh Rd (122)","10:20 - Spl to Garage (from Ashington)","10:45 - Garage (Break)","15:35 - Report (Garage)","15:45 - Parnell St (120)","16:30 - Ashtown (120) (120)","17:20 - Parnell St (120)","18:00 - Ashtown (120)","18:30 - Spl to Garage (from Parnell St)","18:40 - Garage (Finish)"],"Z2|W|153":["06:52 - Report (Garage)","07:30 - Ashtown (120)","08:20 - Parnell St (120)","09:00 - Ashtown (120)","09:45 - Parnell St (120)","10:30 - Ashtown (120)","11:00 - Spl to Garage (from Parnell St)","11:10 - Garage (Break)","15:35 - Parnell Sq-E (122)","16:28 - Drimnagh Rd (122)","18:10 - Spl to Garage (from Ashington)","18:45 - Garage (Finish)"],"Z2|W|154":["06:57 - Report (Garage)","07:35 - Ashington (122)","09:05 - Drimnagh Rd (122)","10:40 - Ashington (122)","11:20 - Parnell Sq-E (Break)","15:40 - Parnell Sq-W (122)","16:34 - Ashington (122)","18:05 - Spl to Garage (from Drimnagh","18:50 - Garage (Finish)"],"Z2|W|155":["07:07 - Report (Garage)","08:00 - Drimnagh Rd (122)","09:40 - Ashington (122)","11:15 - Spl to Garage (from Drimnagh Rd)","11:55 - Garage (Break)","16:05 - Report (Garage)","16:15 - Parnell St (120) Rd)","17:00 - Ashtown (120)","17:40 - Parnell St (120)","18:25 - Spl to Garage (from Ashtown)","18:55 - Garage (Finish)"],"Z2|W|156":["07:12 - Report (Garage)","07:50 - Ashtown (120)","08:50 - Parnell St (120)","09:30 - Ashtown (120)","10:15 - Parnell St (120)","11:00 - Ashtown (120)","11:45 - Parnell St (Break)","16:40 - Report (Garage)","17:20 - Ballsbridge (from RDS to Ashtown)","18:35 - Spl to Garage (from Ashtown)","19:10 - Garage (Finish)"],"Z2|W|157":["07:17 - Report (Garage)","07:55 - Ashington (122)","09:35 - Drimnagh Rd (122)","11:00 - Ashington (122)","11:35 - Parnell Sq-E (Break)","15:04 - Report (Garage)","15:34 - Ashington (122)","17:04 - Drimnagh Rd (122) (120)","18:35 - Spl to Garage (from Ashington)","19:10 - Garage (Finish)"],"Z2|W|158":["07:37 - Report (Garage)","08:15 - Ashington (122)","09:50 - Spl to Garage (from Drimnagh Rd)","10:30 - Garage (Break)","14:45 - Parnell St (120)","15:30 - Ashtown (120)","16:15 - Special to Ballsbridge (RDS)","17:00 - Ballsbridge (from RDS to Ashtown)","18:30 - Ashtown (120)","19:16 - Parnell St (Finish)"],"Z2|W|159":["08:02 - Report (Garage)","08:40 - Ashington (122)","10:10 - Spl to Garage (from Drimnagh","10:50 - Garage (Break)","15:23 - Report (Garage)","15:58 - Ashington (122)","17:28 - Drimnagh Rd (122) (120)","19:15 - Ashington (122)","19:54 - Parnell Sq-E (Finish)"],"Z2|W|160":["08:45 - Parnell Sq-E (122)","09:50 - Drimnagh Rd (122) Rd)","11:20 - Ashington (122)","11:55 - Parnell Sq-E (Break)","15:20 - Parnell Sq-W (122)","16:10 - Ashington (122)","17:40 - Drimnagh Rd (122)","19:15 - Spl to Garage (from Ashington)","19:50 - Garage (Finish)"],"Z2|W|161":["09:15 - Parnell St (120)","10:00 - Ashtown (120)","10:45 - Parnell St (120)","11:30 - Ashtown (120)","12:15 - Parnell St (Break)","16:26 - Parnell Sq-E (122)","17:16 - Drimnagh Rd (122)","18:50 - Spl to Garage (from Ashington)","19:25 - Garage (Finish)"],"Z2|W|162":["09:35 - Parnell Sq-E (122)","10:30 - Drimnagh Rd (122)","12:00 - Ashington (122)","12:35 - Parnell Sq-E (Break)","14:35 - Parnell Sq-E (122)","15:40 - Drimnagh Rd (122)","17:35 - Ashington (122)","19:05 - Spl to Garage (from Drimnagh Rd)","19:40 - Garage (Finish)"],"Z2|SA|101":["06:16 - Report (Garage)","06:55 - Ashington (122)","08:05 - Drimnagh Rd (122)","08:45 - Parnell Sq-W (Break)","09:50 - Parnell Sq-W (122)","10:35 - Ashington (122)","12:05 - Drimnagh Rd (122)","13:11 - Parnell Sq-W (Finish)"],"Z2|SA|102":["06:17 - Report (Garage)","07:05 - Drimnagh Rd (122)","08:15 - Ashington (122)","09:25 - Drimnagh Rd (122)","10:10 - Parnell Sq-W (Break)","11:50 - Parnell Sq-E (122)","12:45 - Drimnagh Rd (122)","14:15 - Ashington (122)","14:59 - Parnell Sq-E (Finish)"],"Z2|SA|103":["06:22 - Report (Garage)","07:00 - Ashtown (120)","07:45 - Parnell St (120)","08:30 - Ashtown (120)","09:15 - Parnell St (Break)","10:10 - Parnell Sq-W (122)","10:55 - Ashington (122)","12:25 - Drimnagh Rd (122)","13:55 - Ashington (122)","14:39 - Parnell Sq-E (Finish)"],"Z2|SA|104":["06:32 - Report (Garage)","07:25 - Drimnagh Rd (122)","08:35 - Ashington (122)","09:45 - Drimnagh Rd (122)","11:15 - Ashington (122)","11:59 - Parnell Sq-E (Finish)"],"Z2|SA|105":["06:37 - Report (Garage)","07:15 - Ashington (122)","08:25 - Drimnagh Rd (122)","09:35 - Ashington (122)","11:05 - Drimnagh Rd (122)","11:50 - Parnell Sq-W (Break)","12:55 - Parnell Sq-E (122)","13:45 - Drimnagh Rd (122)","15:20 - Spl to Garage (from Ashington)","15:50 - Garage (Finish)"],"Z2|SA|106":["06:52 - Report (Garage)","07:45 - Drimnagh Rd (122)","08:55 - Ashington (122)","10:05 - Drimnagh Rd (122)","11:35 - Ashington (122)","12:14 - Parnell Sq-E (Finish)"],"Z2|SA|107":["06:52 - Report (Garage)","07:30 - Ashtown (120)","08:15 - Parnell St (120)","09:00 - Ashtown (120)","09:45 - Parnell St (120)","10:30 - Ashtown (120)","11:15 - Parnell St (Break)","12:05 - Parnell Sq-E (122)","13:05 - Drimnagh Rd (122)","14:11 - Parnell Sq-W (Finish)"],"Z2|SA|108":["06:57 - Report (Garage)","07:15 - Parnell St (120)","08:00 - Ashtown (120)","08:45 - Parnell St (120)","09:30 - Ashtown (120)","10:15 - Parnell St (120)","11:00 - Ashtown (120)","11:45 - Parnell St (Break)","12:40 - Parnell Sq-W (122)","13:15 - Ashington (122)","14:45 - Drimnagh Rd (122)","15:51 - Parnell Sq-W (Finish)"],"Z2|SA|109":["06:57 - Report (Garage)","07:35 - Ashington (122)","08:45 - Drimnagh Rd (122)","09:55 - Ashington (122)","11:25 - Drimnagh Rd (122)","12:21 - Parnell Sq-W (Finish)"],"Z2|SA|110":["11:45 - Parnell St (120)","12:30 - Ashtown (120)","13:15 - Parnell St (120)","14:00 - Ashtown (120)","14:45 - Parnell St (120)","15:30 - Ashtown (120)","16:15 - Parnell St (Break)","17:50 - Parnell Sq-W (122)","18:35 - Ashington (122)","20:10 - Spl to Garage (from Drimnagh Rd)","20:45 - Garage (Finish)"],"Z2|SA|111":["11:50 - Parnell Sq-W (122)","12:35 - Ashington (122)","14:05 - Drimnagh Rd (122)","15:35 - Ashington (122)","16:10 - Parnell Sq-E (Break)","17:35 - Parnell Sq-W (122)","18:15 - Ashington (122)","19:35 - Drimnagh Rd (122)","20:36 - Parnell Sq-W (Finish)"],"Z2|SA|112":["12:10 - Parnell Sq-W (122)","12:55 - Ashington (122)","14:25 - Drimnagh Rd (122)","16:00 - Spl to Garage (from Ashington)","16:35 - Garage (Break)","18:05 - Report (Garage)","18:55 - Drimnagh Rd (122)","20:45 - Ashington (122)","21:19 - Parnell Sq-E (Finish)"],"Z2|SA|113":["12:15 - Parnell St (120)","13:00 - Ashtown (120)","13:45 - Parnell St (120)","14:30 - Ashtown (120)","15:15 - Parnell St (Break)","17:10 - Parnell Sq-E (122)","18:15 - Drimnagh Rd (122)","19:45 - Ashington (122)","21:15 - Spl to Garage (from Drimnagh Rd)","21:50 - Garage (Finish)"],"Z2|SA|114":["13:00 - Parnell Sq-W (122)","13:35 - Ashington (122)","15:05 - Drimnagh Rd (122)","16:35 - Ashington (122)","17:10 - Parnell Sq-E (Break)","18:10 - Parnell Sq-W (122)","18:55 - Ashington (122)","20:30 - Drimnagh Rd (122)","21:55 - Spl to Garage (from Ashington)","22:30 - Garage (Finish)"],"Z2|SA|115":["14:00 - Parnell Sq-W (122)","14:35 - Ashington (122)","16:15 - Drimnagh Rd (122)","17:55 - Ashington (122)","18:30 - Parnell Sq-E (Break)","19:25 - Parnell Sq-W (122)","20:15 - Ashington (122)","21:30 - Spl to Garage (from Drimnagh Rd)","22:05 - Garage (Finish)"],"Z2|SA|116":["14:20 - Parnell Sq-W (122)","14:55 - Ashington (122)","16:35 - Drimnagh Rd (122)","17:35 - Parnell Sq-W (Break)","18:30 - Parnell Sq-E (122)","19:15 - Drimnagh Rd (122)","20:55 - Spl to Garage (from Ashington)","21:30 - Garage (Finish)"],"Z2|SA|117":["14:37 - Ashington (122)","16:55 - Drimnagh Rd (122)","17:50 - Parnell Sq-W (Break)","19:20 - Report (Garage)","20:00 - Drimnagh Rd (122)","21:45 - Ashington (122)","22:19 - Parnell Sq-E (Finish)"],"Z2|SA|118":["15:15 - Parnell St (120)","16:00 - Ashtown (120)","16:45 - Parnell St (120)","17:30 - Ashtown (120)","18:15 - Parnell St (120)","19:00 - Ashtown (120)","19:30 - Parnell St (120)","19:55 - Special to Garage","20:25 - Garage (Break)","21:45 - Report (Garage)","22:15 - Ashington (122)","23:30 - Drimnagh Rd (to Psq-W) (122)","00:15 - Spl to Garage (from Psq-W)","00:25 - Garage (Finish)"],"Z2|SA|119":["15:12 - Report (Garage)","15:55 - Ashington (122)","17:35 - Drimnagh Rd (122)","18:25 - Parnell Sq-W (Break)","20:00 - Parnell St (120)","20:30 - Ashtown (120)","21:00 - Parnell St (120)","21:30 - Ashtown (120)","22:00 - Parnell St (120)","22:30 - Ashtown (120)","23:00 - Parnell St (120)","23:30 - Ashtown (120)","23:55 - Spl to Garage (from Parnell St)","00:05 - Garage (Finish)"],"Z2|SA|120":["15:40 - Parnell Sq-W (122)","16:15 - Ashington (122)","17:55 - Drimnagh Rd (122)","18:50 - Parnell Sq-W (Break)","20:25 - Parnell Sq-W (122)","21:15 - Ashington (122)","22:30 - Drimnagh Rd (122)","23:40 - Spl to Garage (from Ashington)","00:15 - Garage (Finish)"],"Z2|SA|121":["15:45 - Parnell St (120)","16:30 - Ashtown (120)","17:15 - Parnell St (120)","18:00 - Ashtown (120)","18:45 - Parnell St (120)","19:30 - Ashtown (120)","20:00 - Parnell St (Break)","21:10 - Parnell Sq-E (122)","22:00 - Drimnagh Rd (122)","23:30 - Ashington (to Psq-E) (122)","23:50 - Spl to Garage (from Psq-E)","00:00 - Garage (Finish)"],"Z2|SA|122":["16:10 - Parnell Sq-E (122)","17:15 - Drimnagh Rd (122)","18:10 - Parnell Sq-W (Break)","19:15 - Parnell St (120)","20:00 - Ashtown (120)","20:30 - Parnell St (120)","21:00 - Ashtown (120)","21:30 - Parnell St (120)","22:00 - Ashtown (120)","22:30 - Parnell St (120)","23:00 - Ashtown (120)","23:30 - Parnell St (120)","00:00 - Spl to Garage (from Ashtown)","00:25 - Garage (Finish)"],"Z2|SA|123":["16:15 - Parnell St (120)","17:00 - Ashtown (120)","17:45 - Parnell St (120)","18:30 - Ashtown (120)","19:15 - Parnell St (Break)","20:55 - Report (Garage)","21:30 - Drimnagh Rd (122)","23:10 - Ashington (122)","00:15 - Spl to Garage (from Drimnagh Rd)","00:50 - Garage (Finish)"],"Z2|SA|124":["16:12 - Report (Garage)","16:55 - Ashington (122)","18:20 - Special to Garage","18:55 - Garage (Break)","20:20 - Report (Garage)","21:00 - Drimnagh Rd (122)","22:45 - Ashington (122)","23:50 - Spl to Garage (from Drimnagh","00:25 - Garage (Finish)"],"Z2|SA|125":["18:25 - Parnell Sq-W (122)","19:15 - Ashington (122)","20:35 - Special to Garage","21:10 - Garage (Break)","22:10 - Parnell Sq-E (122)","23:00 - Drimnagh Rd (122)","00:15 - Spl to Garage (from Ashington) Rd)","00:50 - Garage (Finish)"],"Z2|SA|151":["07:17 - Report (Garage)","07:55 - Ashington (122)","09:05 - Drimnagh Rd (122)","09:50 - Parnell Sq-W (Break)","11:15 - Parnell St (120)","12:00 - Ashtown (120)","12:45 - Parnell St (120)","13:30 - Ashtown (120)","14:15 - Parnell St (120)","15:00 - Ashtown (120)","15:56 - Parnell St (Finish)"],"Z2|SA|152":["08:45 - Parnell Sq-W (122)","09:15 - Ashington (122)","10:45 - Drimnagh Rd (122)","12:15 - Ashington (122)","12:55 - Parnell Sq-E (Break)","14:30 - Parnell Sq-E (122)","15:25 - Drimnagh Rd (122)","17:05 - Spl to Garage (from Ashington)","17:45 - Garage (Finish)"],"Z2|SA|153":["09:15 - Parnell St (120)","10:00 - Ashtown (120)","10:45 - Parnell St (120)","11:30 - Ashtown (120)","12:15 - Parnell St (Break)","14:50 - Parnell Sq-E (122)","15:55 - Drimnagh Rd (122)","17:35 - Ashington (122)","19:05 - Spl to Garage (from Drimnagh","19:40 - Garage (Finish)"],"Z2|SA|154":["09:32 - Report (Garage)","10:15 - Ashington (122)","11:45 - Drimnagh Rd (122)","12:40 - Parnell Sq-W (Break)","14:55 - Report (Garage)","15:35 - Drimnagh Rd (122)","17:15 - Ashington (122)","18:35 - Drimnagh Rd (122) Rd)","19:36 - Parnell Sq-W (Finish)"],"Z2|SA|155":["09:37 - Drimnagh Rd (122)","14:20 - Parnell Sq-W (Break)","19:55 - Garage (Finish)"],"Z2|SU|101":["07:06 - Report (Garage)","08:00 - Ashington (122)","09:00 - Drimnagh Rd (122)","10:30 - Ashington (122)","11:40 - Drimnagh Rd (122)","12:36 - Parnell Sq-W (Finish)"],"Z2|SU|102":["07:07 - Report (Garage)","08:00 - Drimnagh Rd (122)","09:30 - Ashington (122)","10:00 - Parnell Sq-E (Break)","11:40 - Report (Garage)","12:10 - Ashington (122)","13:40 - Drimnagh Rd (122)","15:10 - Ashington (122)","15:49 - Parnell Sq-E (Finish)"],"Z2|SU|103":["07:37 - Report (Garage)","08:30 - Drimnagh Rd (122)","10:00 - Ashington (122)","11:20 - Drimnagh Rd (122)","12:10 - Parnell Sq-W (Break)","13:25 - Parnell Sq-W (122)","14:10 - Ashington (122)","14:54 - Parnell Sq-E (Finish)"],"Z2|SU|104":["07:52 - Report (Garage)","08:30 - Ashington (122)","10:00 - Drimnagh Rd (122)","11:10 - Ashington (122)","12:40 - Drimnagh Rd (122)","13:36 - Parnell Sq-W (Finish)"],"Z2|SU|105":["08:22 - Report (Garage)","09:00 - Ashington (122)","10:30 - Drimnagh Rd (122)","11:15 - Parnell Sq-W (Break)","12:25 - Parnell Sq-W (122)","13:10 - Ashington (122)","14:40 - Drimnagh Rd (122)","15:41 - Parnell Sq-W (Finish)"],"Z2|SU|106":["08:37 - Report (Garage)","09:30 - Drimnagh Rd (122)","10:50 - Ashington (122)","12:00 - Drimnagh Rd (122)","13:30 - Ashington (122)","14:09 - Parnell Sq-E (Finish)"],"Z2|SU|107":["09:17 - Ashtown (120)","10:30 - Parnell St (120)","11:00 - Ashtown (120)","11:30 - Parnell St (120)","12:00 - Ashtown (120)","12:30 - Parnell St (120)","13:15 - Ashtown (120)","14:00 - Parnell St (120)","14:35 - Spl to Garage (from Ashtown)","14:55 - Garage (Finish)"],"Z2|SU|108":["09:42 - Parnell St (120)","10:30 - Ashtown (120)","11:00 - Parnell St (120)","11:30 - Ashtown (120)","12:00 - Parnell St (120)","12:30 - Ashtown (120)","13:00 - Parnell St (120)","14:15 - Ashtown (120)","15:00 - Spl to Garage (from Parnell St)","15:10 - Garage (Finish)"],"Z2|SU|109":["11:32 - Report (Garage)","12:20 - Drimnagh Rd (122)","13:50 - Ashington (122)","15:20 - Drimnagh Rd (122)","16:10 - Parnell Sq-W (Break)","18:20 - Parnell Sq-E (122)","19:20 - Drimnagh Rd (122)","20:40 - Spl to Garage (from Ashington)","21:15 - Garage (Finish)"],"Z2|SU|110":["12:10 - Parnell Sq-W (122)","12:50 - Ashington (122)","14:20 - Drimnagh Rd (122)","15:50 - Ashington (122)","16:20 - Parnell Sq-E (Break)","17:30 - Parnell St (120)","18:15 - Ashtown (120)","19:00 - Parnell St (120)","19:45 - Ashtown (120)","20:30 - Parnell St (120)","21:00 - Ashtown (120)","21:41 - Parnell St (Finish)"],"Z2|SU|111":["12:12 - Report (Garage)","12:45 - Ashtown (120)","13:30 - Parnell St (120)","14:45 - Ashtown (120)","15:30 - Parnell St (120)","16:15 - Ashtown (120)","17:00 - Parnell St (Break)","18:00 - Parnell St (120)","18:45 - Ashtown (120)","19:30 - Parnell St (120)","20:15 - Ashtown (120)","21:11 - Parnell St (Finish)"],"Z2|SU|112":["13:00 - Parnell Sq-E (122)","14:00 - Drimnagh Rd (122)","15:30 - Ashington (122)","16:05 - Parnell Sq-E (Break)","17:00 - Parnell St (120)","17:45 - Ashtown (120)","18:30 - Parnell St (120)","19:15 - Ashtown (120)","20:00 - Parnell St (120)","20:45 - Ashtown (120)","21:25 - Spl to Garage (from Parnell St)","21:35 - Garage (Finish)"],"Z2|SU|113":["13:12 - Report (Garage)","13:45 - Ashtown (120)","14:30 - Parnell St (120)","15:15 - Ashtown (120)","16:00 - Parnell St (120)","16:45 - Ashtown (120)","17:30 - Parnell St (Break)","18:25 - Parnell Sq-W (122)","19:10 - Ashington (122)","20:30 - Drimnagh Rd (122)","21:35 - Spl to Garage (from Ashington)","22:05 - Garage (Finish)"],"Z2|SU|114":["13:45 - Parnell Sq-W (122)","14:30 - Ashington (122)","15:00 - Parnell Sq-E (Break)","16:20 - Parnell Sq-E (122)","17:20 - Drimnagh Rd (122)","18:50 - Ashington (122)","20:10 - Spl to Garage (from Drimnagh Rd)","20:50 - Garage (Finish)"],"Z2|SU|115":["14:45 - Parnell Sq-E (122)","15:40 - Drimnagh Rd (122)","17:10 - Ashington (122)","18:40 - Drimnagh Rd (122)","19:20 - Parnell Sq-W (Break)","20:20 - Parnell Sq-W (122)","21:00 - Ashington (122)","22:05 - Spl to Garage (from Drimnagh","22:45 - Garage (Finish)"],"Z2|SU|116":["14:42 - Report (Garage)","15:00 - Parnell St (120)","15:45 - Ashtown (120)","16:30 - Parnell St (120)","17:15 - Ashtown (120)","18:00 - Parnell St (Break)","19:00 - Parnell Sq-E (122) Rd)","20:00 - Drimnagh Rd (122)","21:30 - Ashington (122)","22:30 - Drimnagh Rd (122)","23:30 - Ashington (to PsqE) (122)","00:00 - Spl to Garage (from Psq-E)","00:10 - Garage (Finish)"],"Z2|SU|117":["15:00 - Parnell Sq-E (122)","16:00 - Drimnagh Rd (122)","17:30 - Ashington (122)","19:00 - Drimnagh Rd (122)","19:45 - Parnell Sq-W (Break)","21:00 - Parnell St (120)","21:30 - Ashtown (120)","22:00 - Parnell St (120)","22:30 - Ashtown (120)","23:00 - Parnell St (120)","23:30 - Ashtown (120)","23:55 - Spl to Garage (from Parnell St)","00:05 - Garage (Finish)"],"Z2|SU|118":["15:20 - Parnell Sq-E (122)","16:20 - Drimnagh Rd (122)","17:50 - Ashington (122)","18:20 - Parnell Sq-E (Break)","19:45 - Parnell Sq-W (122)","20:30 - Ashington (122)","22:00 - Drimnagh Rd (122)","23:00 - Ashington (122)","00:10 - Spl to Garage (from Drimnagh","00:50 - Garage (Finish)"],"Z2|SU|119":["15:30 - Parnell Sq-W (122)","16:10 - Ashington (122)","17:40 - Drimnagh Rd (122)","18:25 - Parnell Sq-W (Break)","19:20 - Parnell Sq-W (122)","20:00 - Ashington (122)","21:30 - Drimnagh Rd (122)","22:30 - Ashington (122) Rd)","23:30 - Drimnagh Rd (to PsqW) (122)","00:00 - Spl to Garage (from Psq-W)","00:10 - Garage (Finish)"],"Z2|SU|120":["15:40 - Parnell Sq-E (122)","16:40 - Drimnagh Rd (122)","18:10 - Ashington (122)","19:40 - Drimnagh Rd (122)","20:20 - Parnell Sq-W (Break)","21:30 - Parnell St (120)","22:00 - Ashtown (120)","22:30 - Parnell St (120)","23:00 - Ashtown (120)","23:30 - Parnell St (120)","00:00 - Spl to Garage (from Ashtown)","00:20 - Garage (Finish)"],"Z2|SU|121":["16:05 - Parnell Sq-E (122)","17:00 - Drimnagh Rd (122)","18:30 - Ashington (122)","19:00 - Parnell Sq-E (Break)","19:55 - Parnell Sq-E (122)","21:00 - Drimnagh Rd (122)","22:00 - Ashington (122)","23:00 - Drimnagh Rd (122)","00:00 - Spl to Garage (from Ashington)","00:30 - Garage (Finish)"],"Z2|SU|151":["10:00 - Parnell Sq-E (122)","11:00 - Drimnagh Rd (122)","12:30 - Ashington (122)","13:00 - Parnell Sq-E (Break)","14:00 - Parnell Sq-E (122)","15:00 - Drimnagh Rd (122)","16:01 - Parnell Sq-W (Finish)"],"Z2|SU|152":["10:52 - Report (Garage)","11:30 - Ashington (122)","13:00 - Drimnagh Rd (122)","13:45 - Parnell Sq-W (Break)","15:50 - Parnell Sq-W (122)","16:30 - Ashington (122)","18:00 - Drimnagh Rd (122)","19:30 - Ashington (122)","20:04 - Parnell Sq-E (Finish)"],"Z2|SU|153":["11:15 - Parnell Sq-W (122)","11:50 - Ashington (122)","13:20 - Drimnagh Rd (122)","14:50 - Ashington (122)","15:20 - Parnell Sq-E (Break)","16:10 - Parnell Sq-W (122)","16:50 - Ashington (122)","18:20 - Drimnagh Rd (122)","19:40 - Spl to Garage (from Ashington)","20:10 - Garage (Finish)"],"Z1|W|001":["04:42 - Report (Garage)","05:30 - Swords Manor (41)","06:50 - Abbey St (41)","08:05 - Swords Manor (41)","09:50 - Abbey St (Finish)"],"Z1|W|002":["04:46 - Report (Garage)","05:00 - Abbey St (41)","06:15 - Swords Manor (41)","07:30 - Abbey St (41D)","08:40 - Swords Manor (41C)","10:20 - Abbey St (Finish)"],"Z1|W|003":["05:02 - Report (Garage)","06:00 - Stocking Ave (15B)","07:07 - Merrion Sq (15B)","08:15 - Stocking Ave (15B)","09:55 - Special to Garage","10:15 - Garage (Finish)"],"Z1|W|004":["05:12 - Report (Garage)","06:00 - Swords Manor (41)","07:10 - Abbey St (41)","08:25 - Swords Manor (41)","10:00 - Special to Garage","10:10 - Garage (Finish)"],"Z1|W|005":["05:16 - Report (Garage)","05:30 - Abbey St (41)","06:45 - Swords Manor (41C)","08:10 - Abbey St (Break)","09:10 - Abbey St (41)","10:30 - Swords Manor (41)","11:50 - Abbey St (Finish)"],"Z1|W|006":["05:17 - Report (Garage)","06:15 - Stocking Ave (15B)","07:23 - Merrion Sq (15B)","08:45 - Stocking Ave (15B)","10:10 - Merrion Sq (15A)","10:20 - Pearse St (Finish)"],"Z1|W|007":["05:22 - Report (Garage)","06:05 - CBS Swords (41C)","07:00 - Abbey St (41C)","08:15 - Swords Manor (41C)","10:00 - Abbey St (Finish)"],"Z1|W|008":["05:26 - Report (Garage)","05:40 - Abbey St (41)","06:55 - Swords Manor (41)","08:20 - Abbey St (41C)","09:45 - Special to Garage","10:30 - Garage (Finish)"],"Z1|W|009":["05:31 - Report (Garage)","06:30 - Stocking Ave (15B)","07:45 - Merrion Sq (15A)","08:50 - Limekiln Rd (15A)","10:00 - Special to Garage","10:20 - Garage (Finish)"],"Z1|W|010":["05:32 - Report (Garage)","06:20 - CBS Swords (41C)","07:20 - Abbey St (41C)","08:50 - Swords Manor (41)","10:30 - Abbey St (Finish)"],"Z1|W|011":["05:35 - Report (Garage)","05:50 - Abbey St (41)","07:00 - Swords Manor (41)","08:30 - Abbey St (41)","09:50 - Swords Manor (41)","11:10 - Abbey St (Finish)"],"Z1|W|012":["05:36 - Report (Garage)","06:25 - Limekiln Rd (15A)","07:15 - Merrion Sq (15A)","08:05 - Limekiln Rd (15A)","09:27 - Special to Garage","09:47 - Garage (Break)","10:50 - Report (Garage)","11:30 - Swords Manor (41)","13:00 - Abbey St (Finish)"],"Z1|W|013":["05:37 - Report (Garage)","06:25 - Swords Manor (41)","07:40 - Abbey St (41D)","08:40 - Spl to CBS Swords","08:45 - CBS Swords (41C)","09:55 - Special to Garage","10:05 - Garage (Break)","11:20 - Pearse St (15A)","12:10 - Limekiln Rd (15A)","13:00 - Townsend St (Finish)"],"Z1|W|014":["05:42 - Report (Garage)","06:30 - Swords Manor (41C)","07:50 - Abbey St (41)","09:20 - Swords Manor (41C)","10:50 - Abbey St (Finish)"],"Z1|W|015":["05:46 - Report (Garage)","06:45 - Stocking Ave (15B)","08:00 - Merrion Sq (15A)","09:10 - Limekiln Rd (15A)","10:15 - Merrion Sq (15B)","10:25 - Pearse St (Finish)"],"Z1|W|016":["05:47 - Report (Garage)","06:35 - Swords Manor (41)","08:00 - Abbey St (41C)","09:40 - Swords Manor (41C)","11:12 - Abbey St (Finish)"],"Z1|W|017":["05:52 - Report (Garage)","06:20 - Merrion Sq (15B)","07:20 - Stocking Ave (15B)","08:50 - Merrion Sq (15A)","09:05 - Pearse St (Break)","10:00 - Abbey St (41C)","11:20 - Swords Manor (41C)","12:50 - Abbey St (Finish)"],"Z1|W|018":["05:56 - Report (Garage)","06:10 - Abbey St (41)","07:25 - Swords Manor (41)","09:10 - Abbey St (Break)","10:20 - Abbey St (41C)","11:40 - Swords Manor (41C)","13:10 - Abbey St (Finish)"],"Z1|W|019":["06:01 - Report (Garage)","07:00 - Stocking Ave (15B)","08:15 - Merrion Sq (15A)","09:20 - Special to Garage","10:10 - Garage (Break)","11:24 - Report (Garage)","11:30 - Abbey St (41)","13:00 - Swords Manor (41C)","14:30 - Abbey St (Finish)"],"Z1|W|020":["06:02 - Report (Garage)","06:30 - Merrion Sq (15A)","07:20 - Limekiln Rd (15A)","08:30 - Merrion Sq (15A)","09:30 - Limekiln Rd (15A)","10:30 - Merrion Sq (15A)","10:40 - Pearse St (Break)","11:40 - Abbey St (41C)","13:10 - Swords Manor (41)","14:40 - Abbey St (Finish)"],"Z1|W|021":["06:06 - Report (Garage)","06:20 - Abbey St (41B)","07:30 - Rolestown (41B)","09:00 - Abbey St (Break)","10:20 - Pearse St (15A)","11:10 - Limekiln Rd (15A)","12:10 - Merrion Sq (15A)","13:10 - Limekiln Rd (15A)","14:10 - Merrion Sq (15A)","14:20 - Pearse St (Finish)"],"Z1|W|022":["06:09 - Report (Garage)","06:37 - Merrion Sq (15B)","07:50 - Stocking Ave (15B)","09:35 - Special to Garage","09:55 - Garage (Break)","11:10 - Abbey St (41)","12:30 - Swords Manor (41)","14:00 - Special to Garage","14:10 - Garage (Finish)"],"Z1|W|023":["06:12 - Report (Garage)","07:10 - Stocking Ave (15B)","08:40 - Merrion Sq (15B)","10:00 - Stocking Ave (15B)","11:15 - Merrion Sq (15B)","11:25 - Pearse St (Break)","12:25 - Pearse St (15B)","13:30 - Stocking Ave (15B)","14:45 - Merrion Sq (15B)","14:55 - Pearse St (Finish)"],"Z1|W|024":["06:13 - Report (Garage)","07:00 - Limekiln Rd (15A)","08:07 - Merrion Sq (15B)","09:30 - Stocking Ave (15B)","10:25 - Townsend St (Break)","11:20 - Townsend St (15A)","11:30 - Merrion Sq (15A)","12:30 - Limekiln Rd (15A)","13:30 - Merrion Sq (15A)","14:50 - Limekiln Rd (15A)","15:40 - Townsend St (Finish)"],"Z1|W|025":["06:15 - Report (Garage)","06:45 - Merrion Sq (15A)","07:35 - Limekiln Rd (15A)","09:00 - Merrion Sq (15B)","10:15 - Stocking Ave (15B)","11:30 - Merrion Sq (15B)","11:40 - Pearse St (Finish)"],"Z1|W|026":["06:16 - Report (Garage)","06:30 - Abbey St (41)","07:45 - Swords Manor (41)","09:25 - Special to Garage","09:35 - Garage (Break)","11:00 - Abbey St (41C)","12:20 - Swords Manor (41C)","13:50 - Abbey St (Finish)"],"Z1|W|027":["06:17 - Report (Garage)","07:05 - Swords Manor (41C)","08:40 - Abbey St (41C)","10:00 - Swords Manor (41C)","11:20 - Abbey St (Break)","12:20 - Abbey St (41C)","13:50 - Swords Manor (41)","15:20 - Abbey St (Finish)"],"Z1|W|028":["06:22 - Report (Garage)","07:10 - Swords Manor (41)","08:50 - Abbey St (41)","10:10 - Swords Manor (41)","11:35 - Abbey St (Break)","13:00 - Townsend St (15A)","13:10 - Merrion Sq (15A)","14:30 - Limekiln Rd (15A)","15:20 - Townsend St (Finish)"],"Z1|W|029":["06:25 - Report (Garage)","06:53 - Merrion Sq (15B)","08:00 - Stocking Ave (15B)","09:35 - Townsend St (Break)","10:25 - Townsend St (15B)","10:45 - Merrion Sqv (15B)","12:00 - Stocking Ave (15B)","13:15 - Merrion Sq (15B)","14:30 - Stocking Ave (15B)","15:30 - Townsend St (Finish)"],"Z1|W|030":["06:27 - Report (Garage)","07:15 - Swords Manor (41C)","08:50 - Special to Garage","09:00 - Garage (Break)","10:25 - Pearse St (15B)","11:30 - Stocking Ave (15B)","12:45 - Merrion Sq (15B)","14:00 - Stocking Ave (15B)","15:15 - Merrion Sq (15B)","15:25 - Pearse St (Finish)"],"Z1|W|031":["06:31 - Report (Garage)","07:30 - Stocking Ave (15B)","09:10 - Merrion Sq (15A)","10:10 - Limekiln Rd (15A)","11:10 - Merrion Sq (15A)","11:20 - Pearse St (Break)","12:15 - Townsend St (15B)","12:30 - Merrion Sq (15B)","13:45 - Stocking Ave (15B)","15:00 - Merrion Sq (15D)","15:10 - Pearse St (Finish)"],"Z1|W|032":["06:32 - Report (Garage)","07:00 - Merrion Sq (15A)","07:50 - Limekiln Rd (15A)","09:15 - Merrion Sq (15B)","10:30 - Stocking Ave (15B)","11:45 - Merrion Sq (15B)","11:55 - Pearse St (Break)","12:45 - Townsend St (15B)","13:00 - Merrion Sq (15B)","14:15 - Stocking Ave (15B)","15:15 - Townsend St (Finish)"],"Z1|W|033":["11:55 - Pearse St (15B)","13:00 - Stocking Ave (15B)","14:15 - Merrion Sq (15B)","15:30 - Stocking Ave (15B)","16:45 - Merrion Sq (15D)","17:00 - Pearse St (Break)","18:00 - Abbey St (41C)","19:30 - Swords Manor (41C)","20:45 - Special to Garage","20:55 - Garage (Finish)"],"Z1|W|034":["11:50 - Abbey St (41)","13:20 - Swords Manor (41C)","14:50 - Abbey St (Break)","16:00 - Townsend St (15A)","16:10 - Merrion Sq (15A)","17:30 - Limekiln Rd (15A)","18:40 - Merrion Sq (15B)","20:00 - Stocking Ave (15B)","20:50 - Townsend St (Finish)"],"Z1|W|035":["12:00 - Pearse St (15A)","12:50 - Limekiln Rd (15A)","13:50 - Merrion Sq (15A)","15:10 - Limekiln Rd (15A)","16:00 - Townsend St (Break)","17:30 - Abbey St (41)","18:50 - Swords Manor (41C)","20:10 - Special to Garage","20:20 - Garage (Finish)"],"Z1|W|036":["12:00 - Abbey St (41C)","13:30 - Swords Manor (41)","15:00 - Abbey St (Break)","16:40 - Abbey St (41C)","18:30 - Swords Manor (41C)","19:55 - Special to Garage","20:00 - Garage (Finish)"],"Z1|W|037":["12:10 - Pearse St (15B)","13:15 - Stocking Ave (15B)","14:30 - Merrion Sq (15B)","16:00 - Stocking Ave (15B)","17:00 - Townsend St (Break)","18:05 - Pearse St (15B)","19:20 - Stocking Ave (15B)","20:25 - Special to Garage","20:45 - Garage (Finish)"],"Z1|W|038":["11:57 - Report (Garage)","12:40 - Swords Manor (41C)","14:10 - Abbey St (Break)","15:45 - Townsend St (15B)","16:00 - Merrion Sq (15B)","17:30 - Stocking Ave (15B)","18:45 - Merrion Sq (15A)","19:45 - Special to Garage","20:30 - Garage (Finish)"],"Z1|W|039":["12:40 - Townsend St (15A)","12:50 - Merrion Sq (15A)","14:10 - Limekiln Rd (15A)","15:00 - Townsend St (Break)","16:30 - Abbey St (41)","18:20 - Swords Manor (41)","19:45 - Abbey St (41C)","21:05 - Special to Garage","21:45 - Garage (Finish)"],"Z1|W|040":["12:21 - Report (Garage)","12:30 - Abbey St (41)","14:00 - Swords Manor (41C)","15:30 - Abbey St (Break)","17:05 - Report (Garage)","17:20 - Abbey St (41C)","19:00 - Swords Manor (41)","20:15 - Special to Garage","20:25 - Garage (Finish)"],"Z1|W|041":["12:40 - Abbey St (41C)","14:10 - Swords Manor (41)","15:40 - Abbey St (Break)","17:25 - Report (Garage)","17:45 - Merrion Sq (15A)","19:00 - Limekiln Rd (15A)","20:00 - Merrion Sq (15A)","21:00 - Limekiln Rd (15A)","21:50 - Special to Garage","22:10 - Garage (Finish)"],"Z1|W|042":["12:50 - Abbey St (41)","14:20 - Swords Manor (41C)","15:50 - Abbey St (Break)","17:05 - Report (Garage)","17:45 - Limekiln Rd (15A)","19:00 - Merrion Sq (15A)","20:00 - Limekiln Rd (15A)","21:00 - Merrion Sq (15A)","21:10 - Pearse St (Finish)"],"Z1|W|043":["13:15 - Townsend St (15B)","13:30 - Merrion Sq (15B)","14:45 - Stocking Ave (15B)","15:45 - Townsend St (Break)","16:45 - Pearse St (15B)","18:00 - Stocking Ave (15B)","19:20 - Merrion Sq (15B)","20:40 - Stocking Ave (15B)","21:30 - Townsend St (Finish)"],"Z1|W|044":["13:10 - Abbey St (41)","14:40 - Swords Manor (41C)","16:10 - Abbey St (Break)","17:40 - Abbey St (41C)","19:10 - Swords Manor (41C)","20:30 - Abbey St (Finish)"],"Z1|W|045":["12:57 - Report (Garage)","13:40 - Swords Manor (41C)","15:10 - Abbey St (Break)","16:30 - Pearse St (15B)","17:45 - Stocking Ave (15B)","19:00 - Merrion Sq (15B)","20:20 - Stocking Ave (15B)","21:20 - Special to Garage","21:40 - Garage (Finish)"],"Z1|W|046":["13:20 - Abbey St (41C)","14:50 - Swords Manor (41)","16:20 - Abbey St (Break)","17:15 - Pearse St (15A)","18:30 - Limekiln Rd (15A)","19:30 - Merrion Sq (15A)","20:30 - Limekiln Rd (15A)","21:20 - Merrion Sq (15B)","21:30 - Pearse St (Finish)"],"Z1|W|047":["13:30 - Abbey St (41)","15:00 - Swords Manor (41C)","16:30 - Abbey St (Break)","17:50 - Abbey St (41)","19:20 - Swords Manor (41)","20:35 - Special to Garage","20:45 - Garage (Finish)"],"Z1|W|048":["13:50 - Abbey St (41)","15:20 - Swords Manor (41C)","16:50 - Abbey St (Break)","18:10 - Abbey St (41)","19:40 - Swords Manor (41)","20:55 - Special to Garage","21:05 - Garage (Finish)"],"Z1|W|049":["14:10 - Abbey St (41)","15:50 - Swords Manor (41)","17:30 - Abbey St (Break)","18:35 - Abbey St (41B - via Drumcondra)","19:45 - Rolestown (41B - via Drumcondra)","20:45 - Abbey St (Finish)"],"Z1|W|050":["14:30 - Abbey St (41)","16:10 - Swords Manor (41)","17:50 - Abbey St (Break)","19:00 - Abbey St (41)","20:30 - Swords Manor (41)","21:40 - Special to Garage","21:50 - Garage (Finish)"],"Z1|W|051":["14:50 - Abbey St","16:30 - Swords Manor","18:10 - Abbey St (Break)","19:15 - Abbey St (41C)","20:45 - Swords Manor (41C)","22:00 - Abbey St","23:15 - Swords Manor (41C)","00:15 - Special to Garage","00:25 - Garage (Finish)"],"Z1|W|052":["14:55 - Pearse St (15B)","16:15 - Stocking Ave (15B)","17:40 - Merrion Sq (15B)","17:55 - Pearse St (Break)","19:10 - Report (Garage)","19:50 - Swords Manor (41C)","21:00 - Abbey St","22:15 - Swords Manor (41C)","23:20 - Special to Garage","23:26 - Garage (Finish)"],"Z1|W|053":["14:42 - Report (Garage)","15:45 - Stocking Ave (15B)","17:00 - Merrion Sq (15B)","18:30 - Stocking Ave (15B)","19:30 - Townsend St (Break)","20:30 - Abbey St (41)","21:45 - Swords Manor (41C)","23:00 - Abbey St (41)","23:55 - Special to Garage","00:30 - Garage (Finish)"],"Z1|W|054":["15:00 - Abbey St (41C)","16:50 - Swords Manor (41)","18:30 - Abbey St (Break)","19:54 - Report (Garage)","20:00 - Abbey St (41)","21:15 - Swords Manor (41C)","22:25 - Special to Garage","22:35 - Garage (Finish)"],"Z1|W|055":["15:10 - Pearse St (15D)","16:15 - Spl to Stocking Ave","16:30 - Stocking Ave (15B)","17:50 - Merrion Sq (15B)","18:05 - Pearse St (Break)","19:24 - Report (Garage)","19:30 - Abbey St (41)","21:00 - Swords Manor (41)","22:15 - Abbey St (41C)","23:15 - Special to Garage","23:50 - Garage (Finish)"],"Z1|W|056":["14:52 - Report (Garage)","15:40 - Swords Manor (41C)","17:15 - Abbey St (41)","18:40 - Swords Manor (41)","20:00 - Special to Garage","20:00 - Garage (Break)","21:30 - Pearse St (15B)","22:20 - Stocking Ave (15B)","23:10 - Special to Garage","23:30 - Garage (Finish)"],"Z1|W|057":["15:10 - Abbey St (41)","17:00 - Swords Manor (41C)","18:35 - Abbey St (Break)","19:30 - Townsend St (15B)","19:40 - Merrion Sq (15B)","21:00 - Stocking Ave (15B)","22:00 - Merrion Sq (15B)","23:00 - Stocking Ave (15B)","23:50 - Special to Garage","00:10 - Garage (Finish)"],"Z1|W|058":["15:20 - Townsend St (15A)","15:30 - Merrion Sq (15A)","16:50 - Limekiln Rd (15A)","17:45 - Townsend St (Break)","18:45 - Abbey St (41C)","20:15 - Swords Manor (41C)","21:30 - Abbey St (41)","22:45 - Swords Manor (41C)","23:45 - Special to Garage","23:51 - Garage (Finish)"],"Z1|W|059":["15:25 - Pearse St (15B)","16:45 - Stocking Ave (15B)","18:00 - Merrion Sq (15B)","19:20 - Special to Garage","20:10 - Garage (Break)","21:30 - Townsend St (15B)","21:40 - Merrion Sq (15B)","22:40 - Stocking Ave (15B)","23:30 - Merrion Sq (15A)","00:15 - Special to Garage","00:55 - Garage (Finish)"],"Z1|W|060":["15:20 - Abbey St (41C)","17:10 - Swords Manor (41)","18:45 - Abbey St (Break)","19:45 - Townsend St (15B)","20:00 - Merrion Sq (15B)","21:20 - Stocking Ave (15B)","22:20 - Merrion Sq (15B)","23:20 - Stocking Ave (15B)","00:10 - Special to Garage","00:30 - Garage (Finish)"],"Z1|W|061":["15:30 - Townsend St (15B)","15:45 - Merrion Sq (15B)","17:15 - Stocking Ave (15B)","18:30 - Merrion Sq (15A)","19:30 - Limekiln Rd (15A)","20:20 - Townsend St (Break)","21:10 - Pearse St (15A)","22:00 - Limekiln Rd (15A)","23:00 - Merrion Sq (15A)","23:45 - Special to Garage","00:25 - Garage (Finish)"],"Z1|W|062":["15:30 - Abbey St (41)","17:20 - Swords Manor (41C)","18:50 - Special to Garage","19:00 - Garage (Break)","20:09 - Report (Garage)","20:15 - Abbey St (41C)","21:30 - Swords Manor (41)","22:45 - Abbey St (41B - via River Valley)","23:45 - Special to Garage","00:25 - Garage (Finish)"],"Z1|W|063":["15:40 - Townsend St (15A)","15:50 - Merrion Sq (15A)","17:10 - Limekiln Rd (15A)","18:15 - Merrion Sq (15A)","19:25 - Special to Garage","20:05 - Garage (Break)","21:09 - Report (Garage)","21:15 - Abbey St (41C)","22:30 - Swords Manor (41)","23:30 - Abbey St (41)","00:25 - Special to Garage","01:00 - Garage (Finish)"],"Z1|W|064":["15:40 - Abbey St (41C)","17:30 - Swords Manor (41)","19:00 - Abbey St (Break)","20:00 - Townsend St (15B)","20:20 - Merrion Sq (15B)","21:40 - Stocking Ave (15B)","22:40 - Merrion Sq (15B)","23:40 - Special to Garage","00:25 - Garage (Finish)"],"Z1|W|065":["16:00 - Abbey St (41C)","17:50 - Swords Manor (41C)","19:15 - Abbey St (Break)","20:20 - Townsend St (15A)","20:30 - Merrion Sq (15A)","21:30 - Limekiln Rd (15A)","22:30 - Merrion Sq (15A)","23:30 - Limekiln Rd (15A)","00:15 - Special to Garage","00:30 - Garage (Finish)"],"Z1|W|066":["16:47 - Report (Garage)","17:10 - Merrion Sq (15B)","18:45 - Stocking Ave (15B)","19:45 - Townsend St (Break)","20:45 - Abbey St (41C)","22:00 - Swords Manor (41)","23:15 - Abbey St (41C)","00:15 - Special to Garage","00:50 - Garage (Finish)"],"Z1|W|067":["17:07 - Report (Garage)","17:30 - Merrion Sq (15B)","19:00 - Stocking Ave (15B)","20:00 - Townsend St (Break)","20:50 - Townsend St (15B)","21:00 - Merrion Sq (15B)","22:00 - Stocking Ave (15B)","23:00 - Merrion Sq (15B)","00:00 - Special to Garage","00:50 - Garage (Finish)"],"Z1|W|068":["06:41 - Report (Garage)","07:35 - Swords Manor (41C)","09:20 - Abbey St (41C)","10:40 - Swords Manor (41C)","12:00 - Abbey St (Break)","13:00 - Abbey St (41C)","14:30 - Swords Manor (41)","16:00 - Abbey St (Finish)"],"Z1|W|069":["06:42 - Report (Garage)","07:40 - Stocking Ave (15B)","09:30 - Merrion Sq (15A)","10:30 - Limekiln Rd (15A)","11:20 - Townsend St (Break)","14:20 - Pearse St (15A)","15:30 - Limekiln Rd (15A)","16:25 - Townsend St (Finish)"],"Z1|W|070":["07:00 - Report (Garage)","07:30 - Merrion Sq (15A)","08:35 - Limekiln Rd (15A)","09:50 - Special to Garage","10:10 - Garage (Break)","11:35 - Abbey St (41B)","12:45 - Rolestown (41B)","14:00 - Abbey St (41C)","15:35 - Special to Garage","16:15 - Garage (Finish)"],"Z1|W|071":["07:01 - Report (Garage)","08:05 - Whitechurch (15D)","09:30 - Merrion Sq (15B)","10:45 - Stocking Ave (15B)","12:00 - Merrion Sq (15B)","12:10 - Pearse St (Break)","14:20 - Abbey St (41C)","16:00 - Swords Manor (41C)","17:40 - Abbey St (Finish)"],"Z1|W|072":["07:02 - Report (Garage)","07:55 - Swords Manor (41C)","09:40 - Abbey St (41C)","11:00 - Swords Manor (41C)","12:20 - Abbey St (Break)","13:40 - Abbey St (41C)","15:10 - Swords Manor (41)","16:40 - Abbey St (Finish)"],"Z1|W|073":["07:09 - Report (Garage)","07:37 - Merrion Sq (15B)","09:00 - Stocking Ave (15B)","10:20 - Special to Garage","10:40 - Garage (Break)","12:40 - Report (Garage)","13:30 - Limekiln Rd (15A)","14:30 - Merrion Sq (15A)","15:50 - Limekiln Rd (15A)","17:00 - Merrion Sq (15A)","17:15 - Pearse St (Finish)"],"Z1|W|074":["07:17 - Report (Garage)","07:35 - Abbey St (41)","08:55 - Spl to Swords Business","09:00 - Swords Business Park","10:00 - Special to Garage","10:10 - Garage (Break)","11:40 - Pearse St (15B)","12:45 - Stocking Ave (15B)","14:00 - Merrion Sq (15B)","15:15 - Stocking Ave (15B)","16:30 - Merrion Sq (15B)","16:45 - Pearse St (Finish)"],"Z1|W|075":["07:22 - Report (Garage)","08:30 - Stocking Ave (15B) Park","10:00 - Merrion Sq (15B) (41D)","11:15 - Stocking Ave (15B)","12:15 - Townsend St (Break)","15:15 - Townsend St (15B)","15:30 - Merrion Sq (15B)","17:00 - Stocking Ave (15B)","18:20 - Merrion Sq (15B)","18:30 - Pearse St (Finish)"],"Z1|W|076":["07:25 - Report (Garage)","07:53 - Merrion Sq (15B)","09:15 - Stocking Ave (15B)","10:30 - Merrion Sq (15B)","11:45 - Stocking Ave (15B)","12:45 - Townsend St (Break)","16:50 - Abbey St (41)","18:30 - Special to Garage","19:15 - Garage (Finish)"],"Z1|W|077":["07:32 - Report (Garage)","08:20 - Limekiln Rd (15A)","09:45 - Merrion Sq (15B)","11:00 - Stocking Ave (15B)","12:15 - Merrion Sq (15B)","12:25 - Pearse St (Break)","15:50 - Abbey St (41)","17:40 - Swords Manor (41)","19:05 - Special to Garage","19:15 - Garage (Finish)"],"Z1|W|078":["08:10 - Abbey St (41)","09:30 - Swords Manor (41)","10:55 - Special to Garage","11:05 - Garage (Break)","14:40 - Abbey St (41C)","16:20 - Swords Manor (41C)","18:00 - Abbey St (Finish)"],"Z1|W|079":["07:55 - Report (Garage)","08:23 - Merrion Sq (15B)","09:45 - Stocking Ave (15B)","11:00 - Merrion Sq (15B)","12:15 - Stocking Ave (15B)","13:15 - Townsend St (Break)","16:25 - Townsend St (15A)","16:45 - Merrion Sq (15A)","18:15 - Limekiln Rd (15A)","19:15 - Special to Garage","19:35 - Garage (Finish)"],"Z1|W|080":["08:17 - Report (Garage)","09:10 - Swords Manor (41)","10:40 - Abbey St (41C)","12:00 - Swords Manor (41C)","13:30 - Abbey St (Break)","17:00 - Townsend St (15B)","17:20 - Merrion Sq (15B)","18:55 - Special to Garage","19:45 - Garage (Finish)"],"Z1|W|081":["09:00 - Abbey St (41C)","10:20 - Swords Manor (41C)","11:40 - Abbey St (Break)","15:00 - Pearse St (15A)","16:10 - Limekiln Rd (15A)","17:15 - Merrion Sq (15A)","18:35 - Special to Garage","19:15 - Garage (Finish)"],"Z1|W|082":["09:05 - Pearse St (15A)","09:50 - Limekiln Rd (15A)","10:50 - Merrion Sq (15A)","11:50 - Limekiln Rd (15A)","12:40 - Townsend St (Break)","16:10 - Abbey St (41)","18:00 - Swords Manor (41)","19:20 - Special to Garage","19:30 - Garage (Finish)"],"Z1|W|083":["09:35 - Townsend St (15B)","09:50 - Merrion Sq (15A)","10:50 - Limekiln Rd (15A)","11:50 - Merrion Sq (15A)","12:00 - Pearse St (Break)","15:00 - Townsend St (15A)","15:10 - Merrion Sq (15A)","16:30 - Limekiln Rd (15A)","17:30 - Merrion Sq (15A)","18:40 - Special to Garage","19:20 - Garage (Finish)"],"Z1|W|084":["09:50 - Abbey St (41)","11:10 - Swords Manor (41)","12:40 - Abbey St (Break)","16:10 - Report (Garage)","16:30 - Merrion Sq (15A)","18:00 - Limekiln Rd (15A)","19:05 - Special to Garage","19:25 - Garage (Finish)"],"Z1|W|085":["10:30 - Abbey St (41)","11:50 - Swords Manor (41)","13:20 - Abbey St (Break)","16:20 - Abbey St (41C)","18:10 - Swords Manor (41C)","19:35 - Special to Garage","19:45 - Garage (Finish)"],"Z1|W|086":["10:40 - Pearse St (15A)","11:30 - Limekiln Rd (15A)","12:30 - Merrion Sq (15A)","13:50 - Limekiln Rd (15A)","14:50 - Merrion Sq (15A)","15:00 - Pearse St (Break)","17:45 - Townsend St (15A)","18:00 - Merrion Sq (15A)","19:10 - Special to Garage","19:50 - Garage (Finish)"],"Z1|W|087":["10:50 - Abbey St (41)","12:10 - Swords Manor (41)","13:40 - Abbey St (Break)","16:15 - Report (Garage)","16:25 - Abbey St (41B)","18:00 - Rolestown (41B)","19:20 - Special to Garage","19:30 - Garage (Finish)"],"Z1|W|088":["11:20 - Abbey St (41C)","12:50 - Swords Manor (41)","14:20 - Abbey St (Break)","17:00 - Pearse St (15D)","17:05 - Spl to Stocking Ave","18:15 - Stocking Ave (15B)","19:25 - Special to Garage","19:45 - Garage (Finish)"],"Z1|W|089":["11:25 - Pearse St (15B)","12:30 - Stocking Ave (15B)","13:45 - Merrion Sq (15B)","15:00 - Stocking Ave (15B)","16:15 - Merrion Sq (15B)","16:30 - Pearse St (Break)","17:55 - Pearse St (15B)","19:10 - Special to Garage","20:00 - Garage (Finish)"],"Z1|W|091":["18:30 - Pearse St (15B)","19:40 - Stocking Ave (15B)","20:40 - Merrion Sq (15B)","21:50 - Special to Garage","22:35 - Garage (Break) NIGHT","00:00 - Report (Garage)","00:30 - Swords Manor (41)","01:30 - Abbey St (41)","02:30 - Swords Manor (41)","03:30 - Special to Garage","03:36 - Garage (Finish)"],"Z1|W|092":["18:30 - Abbey St (41)","20:00 - Swords Manor (41)","21:10 - Special to Garage","21:20 - Garage (Break)","22:24 - Report (Garage)","22:30 - Abbey St (41)","23:30 - Swords Manor (41)","00:30 - Abbey St (41)","01:30 - Swords Manor (41)","02:30 - Special to Garage","02:36 - Garage (Finish)"],"Z1|W|093":["21:07 - Report (Garage)","21:30 - Merrion Sq (15A)","22:30 - Limekiln Rd (15A)","23:20 - Merrion Sq (15B)","00:15 - Special to Garage","01:00 - Break (Garage)","02:24 - Report (Garage)","02:30 - Abbey St (41)","03:30 - Swords Manor (41)","04:30 - Abbey St (41)","05:25 - Special to Garage","06:00 - Garage (Finish)"],"Z1|W|094":["21:36 - Report (Garage)","21:45 - Abbey St (41C)","23:00 - Swords Manor (41)","00:00 - Abbey St (41)","01:00 - Swords Manor (41)","02:00 - Special to Garage","02:06 - Break (Garage)","03:24 - Report (Garage)","03:30 - Abbey St (41)","04:30 - Swords Manor (41)","05:30 - Special to Garage","05:36 - Garage (Finish)"],"Z1|W|095":["21:37 - Report (Garage)","22:00 - Merrion Sq (15A)","23:00 - Limekiln Rd (15A)","23:45 - Special to Garage","00:05 - Break (Garage)","01:54 - Report (Garage)","02:00 - Abbey St (41)","03:00 - Swords Manor (41)","04:00 - Abbey St (41)","05:00 - Swords Manor (41)","06:05 - Special to Garage","06:11 - Garage (Finish)"],"Z1|W|096":["23:27 - Report (Garage)","00:00 - Swords Manor (41)","01:00 - Abbey St (41)","02:00 - Swords Manor (41)","03:00 - Abbey St (41)","04:00 - Swords Manor (41)","04:54 - Special to Garage","05:00 - Garage (Finish)"],"Z1|SA|001":["04:32 - Report (Garage)","05:20 - Limekiln Rd (15A)","06:00 - Merrion Sq (15A)","07:00 - Limekiln Rd (15A)","07:45 - Merrion Sq (15A)","08:50 - Limekiln Rd (15A)","09:45 - Merrion Sq (15B)","09:55 - Pearse St (Finish)"],"Z1|SA|002":["04:46 - Report (Garage)","05:00 - Abbey St (41)","06:30 - Swords Manor (41)","07:45 - Abbey St (41C)","09:00 - Swords Manor (41)","10:15 - Abbey St (Finish)"],"Z1|SA|003":["04:47 - Report (Garage)","05:30 - Swords Manor (41)","07:00 - Abbey St (41)","08:15 - Swords Manor (41C)","09:25 - Abbey St (Break)","10:20 - Pearse St (15A)","11:10 - Limekiln Rd (15A)","12:00 - Townsend St (Finish)"],"Z1|SA|004":["05:16 - Report (Garage)","05:30 - Abbey St (41)","07:00 - Swords Manor (41)","08:15 - Abbey St (Break)","09:20 - Townsend St (15B)","09:30 - Merrion Sq (15B)","10:30 - Stocking Ave (15B)","11:45 - Merrion Sq (15B)","11:55 - Townsend St (Finish)"],"Z1|SA|005":["05:17 - Report (Garage)","06:00 - Swords Manor (41)","07:15 - Abbey St (41C)","08:30 - Swords Manor (41)","09:55 - Abbey St (Break)","11:00 - Pearse St (15A)","11:50 - Limekiln Rd (15A)","12:40 - Pearse St (Finish)"],"Z1|SA|006":["05:37 - Report (Garage)","06:30 - Stocking Ave (15B)","07:30 - Merrion Sq (15B)","08:30 - Stocking Ave (15B)","09:20 - Townsend St (Break)","10:40 - Report (Garage)","10:40 - Spl to Swords Manor","11:20 - Swords Manor (41)","12:55 - Abbey St (Finish)"],"Z1|SA|007":["05:42 - Report (Garage)","06:30 - Limekiln Rd (15A)","07:15 - Merrion Sq (15A)","08:00 - Limekiln Rd (15A)","08:50 - Merrion Sq (15A)","09:00 - Pearse St (Break)","10:15 - Abbey St (41C)","11:40 - Swords Manor (41)","13:15 - Abbey St (Finish)"],"Z1|SA|008":["05:46 - Report (Garage)","06:00 - Abbey St (41)","07:15 - Swords Manor (41C)","08:30 - Abbey St (Break)","10:05 - Abbey St (41)","11:30 - Swords Manor (41C)","13:05 - Abbey St (Finish)"],"Z1|SA|009":["05:52 - Report (Garage)","06:45 - Stocking Ave (15B)","07:45 - Merrion Sq (15B)","08:45 - Stocking Ave (15B)","09:35 - Townsend St (Break)","10:40 - Pearse St (15B)","11:45 - Stocking Ave (15B)","13:00 - Merrion Sq (15B)","13:10 - Pearse St (Finish)"],"Z1|SA|010":["06:01 - Report (Garage)","06:15 - Abbey St (41C)","07:30 - Swords Manor (41)","08:45 - Abbey St (Break)","09:55 - Pearse St (15B)","10:45 - Stocking Ave (15B)","12:00 - Merrion Sq (15B)","13:15 - Stocking Ave (15B)","14:30 - Merrion Sq (15B)","14:40 - Pearse St (Finish)"],"Z1|SA|011":["06:06 - Report (Garage)","07:00 - Rolestown (41B)","08:20 - Abbey St (41B)","09:25 - Rolestown (41B)","10:25 - Abbey St (Break)","11:25 - Abbey St (41)","12:50 - Swords Manor (41C)","14:25 - Abbey St (Finish)"],"Z1|SA|012":["06:07 - Report (Garage)","07:00 - Stocking Ave (15B)","08:00 - Merrion Sq (15B)","09:00 - Stocking Ave (15B)","10:10 - Merrion Sq (15A)","10:20 - Pearse St (Break)","11:20 - Pearse St (15A)","12:10 - Limekiln Rd (15A)","13:10 - Merrion Sq (15A)","14:10 - Limekiln Rd (15A)","15:10 - Merrion Sq (15A)","15:20 - Pearse St (Finish)"],"Z1|SA|013":["06:12 - Report (Garage)","07:30 - Limekiln Rd (15A) 41","08:05 - Townsend St (Break) 41C","09:35 - Townsend St (15B) 41B","09:50 - Merrion Sq (15A) 41D","10:50 - Limekiln Rd (15A) 15A","11:50 - Merrion Sq (15A) 15B / 15D","14:25 - Pearse St (Finish) Report (Garage)"],"Z1|SA|014":["06:16 - Report (Garage)","06:30 - Abbey St (41)","07:45 - Swords Manor (41C)","09:00 - Abbey St (41)","10:10 - Swords Manor (41C)","11:35 - Abbey St (Break)","12:55 - Pearse St (15B)","14:00 - Stocking Ave (15B)","15:05 - Townsend St (Finish)"],"Z1|SA|015":["06:22 - Report (Garage)","07:15 - Stocking Ave (15B)","08:10 - Merrion Sq (15A)","09:10 - Limekiln Rd (15A)","09:50 - Townsend St (Break)","10:55 - Abbey St (41C)","12:20 - Swords Manor (41)","13:55 - Special to Garage","14:05 - Garage (Finish)"],"Z1|SA|016":["06:37 - Report (Garage)","07:30 - Stocking Ave (15B)","08:15 - Townsend St (Break)","09:50 - Townsend St (15A)","10:00 - Merrion Sq (15B)","11:15 - Stocking Ave (15B)","12:30 - Merrion Sq (15B)","13:45 - Stocking Ave (15B)","15:00 - Special to Garage","15:15 - Garage (Finish)"],"Z1|SA|017":["06:42 - Report (Garage)","07:00 - Merrion Sq (15B)","08:00 - Stocking Ave (15B)","08:45 - Townsend St (Break)","10:15 - Report (Garage)","10:15 - Spl to Stocking Ave","11:00 - Stocking Ave (15B)","12:15 - Merrion Sq (15B)","13:30 - Stocking Ave (15B)","14:50 - Merrion Sq (15A)","15:00 - Pearse St (Finish)"],"Z1|SA|018":["06:52 - Report (Garage)","07:45 - Stocking Ave (15B)","08:45 - Merrion Sq (15B)","09:45 - Stocking Ave (15B)","10:50 - Merrion Sq (15A)","11:00 - Pearse St (Break)","12:05 - Abbey St (41C)","13:30 - Swords Manor (41C)","15:05 - Abbey St (Finish)"],"Z1|SA|019":["06:57 - Report (Garage)","07:15 - Merrion Sq (15B)","08:15 - Stocking Ave (15B)","09:15 - Merrion Sq (15B)","10:15 - Stocking Ave (15B)","11:30 - Merrion Sq (15B)","11:40 - Pearse St (Break)","12:45 - Abbey St (41C)","14:10 - Swords Manor (41C)","15:45 - Abbey St (Finish)"],"Z1|SA|020":["07:11 - Report (Garage)","07:30 - Merrion Sq (15A)","08:25 - Limekiln Rd (15A)","09:10 - Merrion Sq (15A)","10:10 - Limekiln Rd (15A)","11:10 - Merrion Sq (15A)","11:20 - Pearse St (Break)","12:15 - Abbey St (41)","13:40 - Swords Manor (41)","15:15 - Abbey St (Finish)"],"Z1|SA|021":["07:12 - Report (Garage)","08:00 - Swords Manor (41)","09:15 - Abbey St (41C)","10:30 - Swords Manor (41C)","11:55 - Abbey St (Break)","12:55 - Abbey St (41)","14:20 - Swords Manor (41)","15:55 - Abbey St (Finish)"],"Z1|SA|022":["07:16 - Report (Garage)","07:30 - Swords Manor (41)","08:45 - Swords Manor (41C)","10:05 - Abbey St (Break)","11:05 - Abbey St (41)","12:30 - Swords Manor (41C)","14:05 - Abbey St (Finish)"],"Z1|SA|023":["08:05 - Townsend St (15B)","08:15 - Merrion Sq (15B)","09:15 - Stocking Ave (15B)","10:15 - Merrion Sq (15B)","11:30 - Stocking Ave (15B)","12:45 - Merrion Sq (15B)","12:55 - Pearse St (Finish)"],"Z1|SA|024":["07:46 - Report (Garage)","08:00 - Abbey St (41)","09:15 - Swords Manor (41C)","10:35 - Abbey St (Break)","11:40 - Pearse St (15B)","12:45 - Stocking Ave (15B)","14:00 - Merrion Sq (15B)","15:15 - Stocking Ave (15B)","16:30 - Merrion Sq (15B)","16:40 - Pearse St (Finish)"],"Z1|SA|025":["08:15 - Townsend St (15B)","08:30 - Merrion Sq (15B)","09:30 - Stocking Ave","10:30 - Merrion Sq (15B)","10:40 - Pearse St (Break)","11:35 - Abbey St (41)","13:00 - Swords Manor (41)","14:35 - Abbey St (41)","16:10 - Special to Garage","16:50 - Garage (Finish)"],"Z1|SA|026":["08:15 - Abbey St (41C)","09:30 - Swords Manor (41)","10:55 - Abbey St (Break)","11:55 - Abbey St (41)","13:20 - Swords Manor (41)","14:55 - Abbey St (Finish)"],"Z1|SA|027":["11:55 - Pearse St (15B)","13:00 - Stocking Ave (15B)","14:30 - Merrion Sq (15A)","15:30 - Limekiln Rd (15A)","16:20 - Townsend St (Break)","17:45 - Abbey St (41C)","19:10 - Special to Garage","20:00 - Garage (Finish)"],"Z1|SA|028":["12:00 - Townsend St (15A)","12:10 - Merrion Sq (15A)","13:10 - Limekiln Rd (15A)","14:15 - Merrion Sq (15B)","15:30 - Stocking Ave (15B)","16:45 - Merrion Sq (15B)","16:55 - Pearse St (Break)","18:20 - Townsend St (15B)","18:30 - Merrion Sq (15B)","19:40 - Stocking Ave (15B)","21:00 - Merrion Sq (15B)","21:10 - Pearse St (Finish)"],"Z1|SA|029":["12:11 - Report (Garage)","12:25 - Abbey St (41C)","13:50 - Swords Manor (41C)","15:25 - Abbey St (Break)","16:54 - Report (Garage)","17:00 - Abbey St (41B)","18:15 - Rolestown (41B)","19:30 - Abbey St (41)","20:50 - Special to Garage","21:25 - Garage (Finish)"],"Z1|SA|030":["12:35 - Abbey St (41)","14:00 - Swords Manor (41)","15:35 - Abbey St (Break)","17:15 - Abbey St (41)","18:45 - Swords Manor (41C)","20:10 - Special to Garage","20:20 - Garage (Finish)"],"Z1|SA|031":["12:40 - Pearse St (15A)","13:30 - Limekiln Rd (15A)","14:45 - Merrion Sq (15B)","16:00 - Stocking Ave (15B)","17:15 - Merrion Sq (15B)","17:25 - Pearse St (Break)","19:00 - Abbey St (41)","20:30 - Swords Manor (41)","21:35 - Special to Garage","21:45 - Garage (Finish)"],"Z1|SA|032":["13:05 - Townsend St (15B)","13:15 - Merrion Sq (15B)","14:30 - Stocking Ave (15B)","15:50 - Merrion Sq (15A)","16:50 - Limekiln Rd (15A)","17:40 - Townsend St (Break)","18:35 - Abbey St (41)","20:00 - Swords Manor (41)","21:15 - Special to Garage","21:25 - Garage (Finish)"],"Z1|SA|033":["13:05 - Abbey St (41C)","14:30 - Swords Manor (41C)","16:05 - Abbey St (Break)","17:20 - Townsend St (15B)","17:30 - Merrion Sq (15B)","18:45 - Stocking Ave (15B)","20:00 - Merrion Sq (15B)","21:20 - Stocking Ave (15B)","22:10 - Townsend St (Finish)"],"Z1|SA|034":["13:15 - Abbey St (41)","14:50 - Swords Manor (41C)","16:25 - Abbey St (Break)","17:35 - Abbey St (41)","19:00 - Swords Manor (41)","20:15 - Abbey St (Finish)"],"Z1|SA|035":["13:20 - Townsend St (15B)","13:30 - Merrion Sq (15B)","14:45 - Stocking Ave (15B)","16:05 - Special to Garage","16:20 - Garage (Break)","17:50 - Townsend St (15B)","18:00 - Merrion Sq (15B)","19:20 - Stocking Ave (15B)","20:40 - Merrion Sq (15B)","20:50 - Pearse St (Finish)"],"Z1|SA|036":["13:25 - Abbey St (41C)","15:00 - Swords Manor (41)","16:30 - Special to Garage","16:40 - Garage (Break)","18:20 - Report (Garage)","19:00 - Limekiln Rd (15A)","20:00 - Merrion Sq (15A)","21:00 - Limekiln Rd (15A)","21:40 - Townsend St (Finish)"],"Z1|SA|037":["13:12 - Report (Garage)","13:30 - Merrion Sq (15A)","14:30 - Limekiln Rd (15A)","15:25 - Townsend St (Break)","16:55 - Pearse St (15B)","18:00 - Stocking Ave (15B)","19:20 - Merrion Sq (15B)","20:40 - Stocking Ave (15B)","21:45 - Special to Garage","21:55 - Garage (Finish)"],"Z1|SA|038":["13:35 - Abbey St (41)","15:10 - Swords Manor (41C)","16:35 - Abbey St (Break)","17:40 - Townsend St (15A)","17:50 - Merrion Sq (15A)","18:45 - Limekiln Rd (15A)","19:40 - Merrion Sq (15B)","21:00 - Stocking Ave (15B)","22:05 - Special to Garage","22:15 - Garage (Finish)"],"Z1|SA|039":["14:05 - Abbey St (41C)","15:40 - Swords Manor (41)","17:05 - Abbey St (Break)","18:25 - Abbey St (41C)","19:45 - Swords Manor (41C)","21:00 - Abbey St (Finish)"],"Z1|SA|040":["14:45 - Abbey St (41C)","16:10 - Swords Manor (41C)","17:35 - Abbey St (Break)","18:35 - Townsend St (15B)","18:45 - Merrion Sq (15B)","20:00 - Stocking Ave (15B)","21:20 - Merrion Sq (15B)","22:30 - Special to Garage","23:15 - Garage (Finish)"],"Z1|SA|041":["14:55 - Abbey St (41)","16:20 - Swords Manor (41)","17:45 - Abbey St (Break)","18:45 - Abbey St (41C)","20:15 - Swords Manor (41C)","21:30 - Abbey St (41)","22:45 - Swords Manor (41C)","23:45 - Special to Garage","23:51 - Garage (Finish)"],"Z1|SA|042":["15:00 - Pearse St (15A)","15:50 - Limekiln Rd (15A)","16:50 - Merrion Sq (15A)","17:50 - Limekiln Rd (15A)","19:00 - Merrion Sq (15A)","19:10 - Pearse St (Break)","20:15 - Abbey St (41C)","21:30 - Swords Manor (41)","22:45 - Abbey St (41B)","23:50 - Special to Garage","00:30 - Garage (Finish)"],"Z1|SA|043":["15:05 - Townsend St (15B)","15:15 - Merrion Sq (15B)","16:30 - Stocking Ave (15B)","17:45 - Merrion Sq (15B)","19:00 - Stocking Ave (15B)","20:00 - Townsend St (Break)","21:00 - Abbey St (41)","22:15 - Swords Manor (41C)","23:20 - Special to Garage","23:26 - Garage (Finish)"],"Z1|SA|044":["15:05 - Abbey St (41C)","16:40 - Swords Manor (41)","18:05 - Abbey St (41C)","19:25 - Special to Garage","20:05 - Garage (Break)","21:40 - Townsend St (15A)","22:00 - Merrion Sq (15B)","23:00 - Stocking Ave (15B)","00:00 - Special to Garage","00:10 - Garage (Finish)"],"Z1|SA|045":["15:15 - Abbey St (41)","16:50 - Swords Manor (41C)","18:15 - Abbey St (Break)","19:15 - Abbey St (41C)","20:45 - Swords Manor (41C)","22:00 - Abbey St (41)","23:15 - Swords Manor (41C)","00:10 - Special to Garage","00:16 - Garage (Finish)"],"Z1|SA|046":["15:20 - Pearse St (15A)","16:10 - Limekiln Rd (15A)","17:10 - Merrion Sq (15A)","18:10 - Limekiln Rd (15A)","19:10 - Special to Garage","19:20 - Garage (Break)","20:30 - Abbey St (41)","21:45 - Swords Manor (41C)","23:00 - Abbey St (41)","00:00 - Special to Garage","00:35 - Garage (Finish)"],"Z1|SA|047":["15:25 - Townsend St (15A)","15:45 - Merrion Sq (15B)","17:00 - Stocking Ave (15B)","18:15 - Merrion Sq (15B)","19:25 - Special to Garage","20:10 - Garage (Break)","21:50 - Report (Garage)","22:00 - Merrion Sq (15A)","23:00 - Limekiln Rd (15A)","23:55 - Special to Garage","00:05 - Garage (Finish)"],"Z1|SA|048":["15:25 - Abbey St (41C)","16:55 - Special to Garage","17:35 - Garage (Break)","19:10 - Pearse St (15B)","20:20 - Stocking Ave (15B)","21:40 - Merrion Sq (15B)","22:40 - Stocking Ave (15B)","23:45 - Special to Garage","23:55 - Garage (Finish)"],"Z1|SA|049":["15:12 - Report (Garage)","15:30 - Merrion Sq (15A)","16:30 - Limekiln Rd (15A)","17:30 - Merrion Sq (15A)","18:30 - Limekiln Rd (15A)","19:30 - Merrion Sq (15A)","19:40 - Pearse St (Break)","20:50 - Pearse St (15B)","22:00 - Stocking Ave (15B)","23:00 - Merrion Sq (15B)","00:05 - Special to Garage","00:50 - Garage (Finish)"],"Z1|SA|050":["15:55 - Abbey St (41)","17:20 - Swords Manor (41)","18:45 - Abbey St (Break)","19:45 - Abbey St (41C)","21:00 - Swords Manor (41)","22:15 - Abbey St (41C)","23:20 - Special to Garage","23:55 - Garage (Finish)"],"Z1|SA|051":["15:47 - Report (Garage)","16:30 - Swords Manor (41C)","17:55 - Abbey St (41)","19:15 - Swords Manor (41C)","20:30 - Abbey St (Break)","22:10 - Townsend St (15B)","22:20 - Merrion Sq (15B)","23:20 - Stocking Ave (15B)","00:20 - Special to Garage","00:30 - Garage (Finish)"],"Z1|SA|052":["16:05 - Abbey St (41C)","17:30 - Swords Manor (41C)","19:00 - Abbey St (Break)","20:00 - Townsend St (15B)","20:20 - Merrion Sq (15B)","21:40 - Stocking Ave (15B)","22:40 - Merrion Sq (15B)","23:40 - Special to Garage","00:25 - Garage (Finish)"],"Z1|SA|053":["16:20 - Townsend St (15A)","16:30 - Merrion Sq (15A)","17:30 - Limekiln Rd (15A)","18:30 - Merrion Sq (15A)","19:30 - Limekiln Rd (15A)","20:20 - Townsend St (Break)","21:10 - Pearse St (15B)","22:20 - Stocking Ave (15B)","23:20 - Merrion Sq (15B)","00:25 - Special to Garage","01:10 - Garage (Finish)"],"Z1|SA|054":["16:25 - Abbey St (41C)","17:50 - Swords Manor (41C)","19:15 - Abbey St (Break)","20:20 - Townsend St (15A)","20:30 - Merrion Sq (15A)","21:30 - Limekiln Rd (15A)","22:30 - Merrion Sq (15A)","23:30 - Limekiln Rd (15A)","00:25 - Special to Garage","00:35 - Garage (Finish)"],"Z1|SA|055":["17:05 - Abbey St (41C)","18:30 - Swords Manor (41)","20:00 - Abbey St (41)","21:15 - Swords Manor (41C)","22:25 - Special to Garage","22:35 - Garage (Break)"],"Z1|SA|056":["19:10 - Pearse St (15A)","20:00 - Limekiln Rd (15A)","21:00 - Merrion Sq (15A)","22:00 - Limekiln Rd (15A)","23:00 - Merrion Sq (15A)","23:50 - Special to Garage","00:30 - Garage (Finish)"],"Z1|SA|057":["19:40 - Pearse St (15A)","20:30 - Limekiln Rd (15A)","21:30 - Merrion Sq (15A)","22:30 - Limekiln Rd (15A)","23:30 - Merrion Sq (15A)","00:25 - Special to Garage","01:05 - Garage (Finish)"],"Z1|SA|068":["08:12 - Report (Garage)","08:30 - Merrion Sq (15A)","09:30 - Limekiln Rd (15A)","10:30 - Merrion Sq (15A)","11:30 - Limekiln Rd (15A)","12:30 - Merrion Sq (15A)","12:40 - Pearse St (Break)","13:55 - Abbey St (41)","15:20 - Swords Manor (41)","16:57 - Abbey St (Finish)"],"Z1|SA|069":["08:30 - Abbey St (41)","09:45 - Swords Manor (41C)","11:05 - Abbey St (Break)","12:40 - Townsend St (15A)","12:50 - Merrion Sq (15A)","13:50 - Limekiln Rd (15A)","15:00 - Merrion Sq (15B)","16:15 - Stocking Ave (15B)","17:37 - Townsend St (Finish)"],"Z1|SA|070":["08:45 - Townsend St (15B)","09:00 - Merrion Sq (15B)","10:00 - Stocking Ave (15B)","11:15 - Merrion Sq (15B)","12:30 - Stocking Ave (15B)","13:40 - Townsend St (Break)","15:45 - Abbey St (41C)","17:10 - Swords Manor (41C)","18:47 - Abbey St (Finish)"],"Z1|SA|074":["09:12 - Report (Garage)","09:30 - Merrion Sq (15A)","10:30 - Limekiln Rd (15A)","11:30 - Merrion Sq (15A)","12:30 - Limekiln Rd (15A)","13:25 - Townsend St (Break)","14:25 - Pearse St (15A)","15:10 - Limekiln Rd (15A)","16:10 - Merrion Sq (15A)","17:10 - Limekiln Rd (15A)","18:10 - Merrion Sq (15A)","18:37 - Pearse St (Finish)"],"Z1|SA|075":["09:21 - Report (Garage)","09:35 - Abbey St (41C)","10:50 - Swords Manor (41C)","12:15 - Abbey St (Break)","13:40 - Townsend St (15B)","13:50 - Merrion Sq (15A)","14:50 - Limekiln Rd (15A)","16:00 - Merrion Sq (15B)","17:15 - Stocking Ave (15B)","18:37 - Townsend St (Finish)"],"Z1|SA|076":["09:31 - Report (Garage)","09:45 - Abbey St (41)","11:00 - Swords Manor (41)","12:35 - Abbey St (Break)","13:45 - Abbey St (41C)","15:30 - Swords Manor (41C)","16:55 - Abbey St (41)","18:20 - Special to Garage","19:00 - Garage (Finish)"],"Z1|SA|077":["09:32 - Report (Garage)","10:20 - Swords Manor (41)","11:45 - Abbey St (41C)","13:10 - Swords Manor (41C)","14:45 - Abbey St (Break)","17:25 - Pearse St (15B)","18:30 - Stocking Ave (15B)","19:45 - Special to Garage","19:55 - Garage (Finish)"],"Z1|SA|078":["09:55 - Abbey St (41C)","11:10 - Swords Manor (41C)","12:45 - Abbey St (Break)","14:00 - Report (Garage)","14:40 - Swords Manor (41)","16:15 - Abbey St (41)","17:40 - Swords Manor (41)","19:05 - Special to Garage","19:15 - Garage (Finish)"],"Z1|SA|079":["10:25 - Abbey St (41)","11:50 - Swords Manor (41C)","13:25 - Abbey St (Break)","14:25 - Abbey St (41C)","16:00 - Swords Manor (41)","17:25 - Abbey St (41C)","18:45 - Special to Garage","19:25 - Garage (Finish)"],"Z1|SA|080":["10:35 - Abbey St (41C)","12:00 - Swords Manor (41)","13:35 - Abbey St (Break)","15:35 - Abbey St (41)","17:00 - Swords Manor (41)","18:37 - Abbey St (Finish)"],"Z1|SA|081":["10:31 - Report (Garage)","10:45 - Abbey St (41)","12:10 - Swords Manor (41C)","13:45 - Abbey St (Break)","16:35 - Abbey St (41)","18:00 - Swords Manor (41)","19:25 - Special to Garage","19:35 - Garage (Finish)"],"Z1|SA|082":["10:42 - Report (Garage)","11:00 - Merrion Sq (15B)","12:15 - Stocking Ave (15B)","13:20 - Townsend St (Break)","14:40 - Pearse St (15B)","15:45 - Stocking Ave (15B)","17:00 - Merrion Sq (15B)","18:15 - Stocking Ave (15B)","19:30 - Special to Garage","19:45 - Garage (Finish)"],"Z1|SA|083":["11:01 - Report (Garage)","11:15 - Abbey St (41C)","12:40 - Swords Manor (41)","14:15 - Abbey St (Break)","16:45 - Abbey St (41C)","18:15 - Swords Manor (41C)","19:57 - Abbey St (Finish)"],"Z1|SA|084":["11:06 - Report (Garage)","11:20 - Abbey St (41B)","12:30 - Rolestown (41B)","13:55 - Abbey St (Break)","16:40 - Pearse St (15B)","17:45 - Stocking Ave (15B)","19:00 - Merrion Sq (15B)","19:27 - Pearse St (Finish)"],"Z1|SA|091":["18:15 - Abbey St (41)","19:30 - Swords Manor (41)","20:45 - Special to Garage","20:55 - Garage (Break)","22:24 - Report (Garage) NIGHT","22:30 - Abbey St (41)","23:30 - Swords Manor (41)","00:30 - Abbey St (41)","01:30 - Swords Manor (41)","02:30 - Special to Garage","02:36 - Garage (Finish)"],"Z1|SA|092":["18:20 - Pearse St (15A)","19:10 - Special to Garage","19:55 - Garage (Break)","21:39 - Report (Garage)","21:45 - Abbey St (41C)","23:00 - Swords Manor (41)","00:00 - Abbey St (41)","01:00 - Swords Manor (41)","02:00 - Special to Garage","02:06 - Garage (Finish)"],"Z1|SA|093":["20:36 - Report (Garage)","20:45 - Abbey St (41C)","22:00 - Swords Manor (41)","23:15 - Abbey St (41C)","00:15 - Special to Garage","00:50 - Garage (Break)","01:54 - Report (Garage)","02:00 - Abbey St (41)","03:00 - Swords Manor (41)","04:00 - Abbey St (41)","05:00 - Swords Manor (41)","06:00 - Special to Garage","06:06 - Garage (Finish)"],"Z1|SA|094":["21:06 - Report (Garage)","21:15 - Abbey St (41C)","22:30 - Swords Manor (41)","23:30 - Abbey St (41)","00:30 - Special to Garage","01:05 - Garage (Break)","02:24 - Report (Garage)","02:30 - Abbey St (41)","03:30 - Swords Manor (41)","04:30 - Abbey St (41)","05:30 - Special to Garage","06:00 - Garage (Finish)"],"Z1|SA|095":["23:27 - Report (Garage)","00:00 - Swords Manor (41)","01:00 - Abbey St (41)","02:00 - Swords Manor (41)","03:00 - Abbey St (41)","04:00 - Swords Manor (41)","04:54 - Special to Garage","05:00 - Garage (Finish)"],"Z1|SA|096":["23:57 - Report (Garage)","00:30 - Swords Manor (41)","01:30 - Abbey St (41)","02:30 - Swords Manor (41)","03:30 - Abbey St (41)","04:30 - Swords Manor (41)","05:24 - Special to Garage","05:30 - Garage (Finish)"],"Z1|SU|001":["04:46 - Report (Garage)","05:00 - Abbey St (41)","06:30 - Swords Manor (41)","08:00 - Special to Garage","08:30 - Garage (Break)","09:45 - Report (Garage)","10:00 - Merrion Sq (15A)","11:00 - Limekiln Rd (15A)","12:00 - Merrion Sq (15A)","12:10 - Pearse St (Finish)"],"Z1|SU|002":["04:52 - Report (Garage)","05:30 - Swords Manor (41)","07:00 - Abbey St (41)","08:15 - Swords Manor (41)","09:30 - Abbey St (Finish)"],"Z1|SU|003":["05:16 - Report (Garage)","05:30 - Abbey St (41)","07:00 - Swords Manor (41)","08:21 - Special to Garage","08:31 - Garage (Break)","09:39 - Report (Garage)","09:45 - Abbey St (41C)","11:00 - Swords Manor (41C)","12:30 - Abbey St (Finish)"],"Z1|SU|004":["05:22 - Report (Garage)","06:00 - Swords Manor (41)","07:30 - Abbey St (41)","08:45 - Swords Manor (41)","10:00 - Abbey St (Finish)"],"Z1|SU|005":["05:46 - Report (Garage)","06:00 - Abbey St (41)","07:20 - Swords Manor (41)","08:30 - Abbey St (41)","09:45 - Swords Manor (41)","11:15 - Abbey St (Finish)"],"Z1|SU|006":["06:16 - Report (Garage)","06:30 - Abbey St (41)","07:45 - Swords Manor (41)","09:15 - Break (Abbey St)","10:39 - Report (Garage)","10:45 - Abbey St (41C)","12:00 - Swords Manor (41C)","13:30 - Special to Garage","13:40 - Garage (Finish)"],"Z1|SU|007":["06:42 - Report (Garage)","07:30 - Swords Manor (41C)","09:00 - Break (Abbey St)","09:37 - Report (Garage)","10:10 - Townsend St (15B)","10:15 - Merrion Sq (15B)","11:15 - Stocking Ave (15B)","12:25 - Merrion Sq (15B)","13:40 - Special to Garage","14:25 - Garage (Finish)"],"Z1|SU|008":["07:22 - Report (Garage)","08:15 - Stocking Ave (15B)","09:15 - Merrion Sq (15B)","10:15 - Stocking Ave (15B)","11:45 - Merrion Sq (15B)","12:00 - Pearse St (Finish)"],"Z1|SU|009":["07:27 - Report (Garage)","08:15 - Limekiln Rd (15A)","09:00 - Merrion Sq (15A)","09:45 - Limekiln Rd (15A)","10:35 - Special to Garage","10:50 - Garage (Break)","12:30 - Abbey St (41)","14:00 - Swords Manor (41C)","15:30 - Special to Garage","15:40 - Garage (Finish)"],"Z1|SU|010":["07:46 - Report (Garage)","08:00 - Abbey St (41)","09:15 - Swords Mano (41)","10:30 - Abbey St (41)","11:45 - Swords Manor (41)","13:10 - Special to Garage","13:20 - Garage (Finish)"],"Z1|SU|011":["07:52 - Report (Garage)","08:45 - Stocking Ave (15B)","09:45 - Merrion Sq (15B)","10:45 - Stocking Ave (15B)","12:05 - Merrion Sq (15B)","12:15 - Pearse St (Finish)"],"Z1|SU|012":["07:57 - Report (Garage)","08:45 - Limekiln Rd (15A)","09:30 - Merrion Sq (15A)","10:30 - Limekiln Rd (15A)","11:30 - Merrion Sq (15A)","12:30 - Limekiln Rd (15A)","13:20 - Townsend St (Finish)"],"Z1|SU|013":["08:12 - Report (Garage)","09:00 - Swords Manor (41C)","10:15 - Abbey St (41C)","11:30 - Swords Manor (41C)","13:00 - Abbey St (Finish)"],"Z1|SU|014":["08:22 - Report (Garage)","09:15 - Stocking Ave (15B)","10:10 - Townsend St (Break)","11:10 - Pearse St (15A)","12:00 - Limekiln Rd (15A)","13:00 - Merrion Sq (15A)","14:00 - Limekiln Rd (15A)","14:50 - Townsend St (Finish)"],"Z1|SU|015":["08:27 - Report (Garage)","09:15 - Limekiln Rd (15A)","10:30 - Merrion Sq (15A)","11:30 - Limekiln Rd (15A)","12:20 - Townsend St (Break)","13:20 - Townsend St (15A)","13:30 - Merrion Sq (15A)","14:30 - Limekiln Rd (15A)","15:30 - Merrion Sq (15A)","15:40 - Pearse St (Finish)"],"Z1|SU|016":["09:00 - Abbey St (41)","10:15 - Swords Manor (41)","11:40 - Abbey St (41B)","12:45 - Rolestown (41B)","14:00 - Abbey St (Finish)"],"Z1|SU|017":["08:52 - Report (Garage)","09:45 - Stocking Ave (15B)","10:45 - Merrion Sq (15B)","11:45 - Stocking Ave (15B)","13:05 - Merrion Sq (15B)","13:15 - Pearse St (Finish)"],"Z1|SU|018":["09:15 - Abbey St (41C)","10:30 - Swords Manor (41C)","11:50 - Special to Garage","12:00 - Garage (Break)","13:15 - Pearse St (15B)","14:25 - Stocking Ave (15B)","15:25 - Townsend St (Finish)"],"Z1|SU|019":["11:31 - Report (Garage)","11:45 - Abbey St (41C)","13:00 - Swords Manor (41C)","14:30 - Abbey St (Break)","16:05 - Townsend St (15B)","16:25 - Merrion Sq (15B)","17:45 - Stocking Ave (15B)","18:45 - Merrion Sq (15B)","19:50 - Special to Garage","20:35 - Garage (Finish)"],"Z1|SU|020":["11:55 - Pearse St (15B)","13:05 - Stocking Ave (15B)","14:25 - Merrion Sq (15B)","15:45 - Stocking Ave (15B)","16:45 - Townsend St (Break)","18:50 - Report (Garage)","19:30 - Swords Manor (41C)","20:45 - Abbey St (Finish)"],"Z1|SU|021":["12:00 - Abbey St (41)","13:15 - Swords Manor (41)","14:40 - Special to Garage","14:50 - Garage (Break)","16:20 - Townsend St (15A)","16:30 - Merrion Sq (15A)","17:30 - Limekiln Rd (15A)","18:25 - Merrion Sq (15B)","19:35 - Special to Garage","20:20 - Garage (Finish)"],"Z1|SU|022":["12:10 - Pearse St (15A)","13:00 - Limekiln Rd (15A)","14:00 - Merrion Sq (15A)","15:00 - Limekiln Rd (15A)","16:00 - Merrion Sq (15A)","16:10 - Pearse St (Break)","17:45 - Abbey St (41C)","19:15 - Swords Manor (41)","20:30 - Abbey St (Finish)"],"Z1|SU|023":["12:15 - Pearse St (15B)","13:25 - Stocking Ave (15B)","14:45 - Merrion Sq (15B)","14:55 - Pearse St (Break)","16:15 - Abbey St (41C)","17:45 - Swords Manor (41)","19:10 - Abbey St (41B)","20:20 - Rolestown (41B)","21:20 - Special to Garage","21:30 - Garage (Finish)"],"Z1|SU|024":["11:57 - Report (Garage)","12:45 - Stocking Ave (15B)","14:05 - Merrion Sq (15B)","15:25 - Stocking Ave (15B)","16:45 - Merrion Sq (15B)","16:55 - Pearse St (Break)","19:00 - Report (Garage)","19:45 - Stocking Ave (15B)","20:45 - Merrion Sq (15B)","20:55 - Pearse St (Finish)"],"Z1|SU|025":["12:01 - Report (Garage)","12:15 - Abbey St (41C)","13:45 - Swords Manor (41)","15:15 - Abbey St (Break)","16:15 - Pearse St (15B)","17:25 - Stocking Ave (15B)","18:30 - Merrion Sq (15A)","19:30 - Limekiln Rd (15A)","20:30 - Merrion Sq (15A)","20:40 - Pearse St (Finish)"],"Z1|SU|026":["12:17 - Report (Garage)","12:45 - Merrion Sq (15B)","14:05 - Stocking Ave (15B)","15:25 - Merrion Sq (15B)","15:35 - Pearse St (Break)","16:55 - Pearse St (15B)","18:05 - Stocking Ave (15B)","19:15 - Merrion Sq (15B)","20:15 - Stocking Ave (15B)","21:15 - Merrion Sq (15B)","21:25 - Pearse St (Finish)"],"Z1|SU|027":["12:45 - Abbey St (41C)","14:15 - Swords Manor (41)","15:30 - Abbey St (Break)","16:45 - Abbey St (41C)","18:00 - Swords Manor (41C)","19:15 - Abbey St (41C)","20:30 - Swords Manor (41C)","21:40 - Special to Garage","21:50 - Garage (Finish)"],"Z1|SU|028":["13:00 - Abbey St (41)","14:30 - Swords Manor (41C)","16:00 - Abbey St (Break)","17:35 - Report (Garage)","18:15 - Swords Manor (41)","19:30 - Abbey St (41)","20:45 - Swords Manor (41)","21:55 - Special to Garage","22:05 - Garage (Finish)"],"Z1|SU|029":["12:47 - Report (Garage)","13:30 - Swords Manor (41C)","15:00 - Abbey St (41)","16:30 - Swords Manor (41C)","18:00 - Abbey St (Break)","19:40 - Pearse St (15A)","20:30 - Limekiln Rd (15A)","21:15 - Special to Garage","21:30 - Garage (Finish)"],"Z1|SU|030":["12:57 - Report (Garage)","13:45 - Stocking Ave (15B)","15:05 - Merrion Sq (15B)","16:25 - Stocking Ave (15B)","17:45 - Merrion Sq (15B)","17:55 - Pearse St (Break)","19:00 - Abbey St (41)","20:15 - Swords Manor (41)","21:30 - Abbey St (Finish)"],"Z1|SU|031":["13:06 - Report (Garage)","13:15 - Abbey St (41C)","14:45 - Swords Manor (41)","16:15 - Abbey St (Break)","17:45 - Townsend St (15A)","18:00 - Merrion Sq (15A)","19:00 - Limekiln Rd (15A)","20:00 - Merrion Sq (15A)","20:45 - Limekiln Rd (15A)","21:20 - Townsend St (Finish)"],"Z1|SU|032":["14:00 - Abbey St (41)","15:30 - Swords Manor (41C)","17:00 - Abbey St (Break)","18:30 - Abbey St (41)","19:45 - Swords Manor (41)","21:00 - Abbey St (Finish)"],"Z1|SU|033":["14:06 - Report (Garage)","14:15 - Abbey St (41C)","15:45 - Swords Manor (41)","17:15 - Abbey St (Break)","18:45 - Abbey St (41C)","20:00 - Swords Manor (41C)","21:15 - Abbey St (Finish)"],"Z1|SU|034":["14:50 - Townsend St (15A)","15:00 - Merrion Sq (15A)","16:00 - Limekiln Rd (15A)","17:00 - Merrion Sq (15A)","18:00 - Limekiln Rd (15A)","19:00 - Merrion Sq (15A)","19:10 - Pearse St (Break)","20:25 - Pearse St (15B)","21:15 - Stocking Ave (15B)","22:15 - Merrion Sq (15B)","23:15 - Stocking Ave (15B)","00:05 - Special to Garage","00:15 - Garage (Finish)"],"Z1|SU|035":["14:55 - Pearse St (15B)","16:05 - Stocking Ave (15B)","17:25 - Merrion Sq (15B)","18:45 - Stocking Ave (15B)","19:35 - Townsend St (Break)","20:55 - Pearse St (15B)","21:45 - Stocking Ave (15B)","22:45 - Merrion Sq (15B)","23:40 - Special to Garage","00:20 - Garage (Finish)"],"Z1|SU|036":["14:36 - Report (Garage)","14:45 - Abbey St (41C)","16:15 - Swords Manor (41)","17:45 - Abbey St (Break)","19:10 - Pearse St (15A)","20:00 - Limekiln Rd (15A)","21:00 - Merrion Sq (15A)","21:45 - Limekiln Rd (15A)","22:30 - Merrion Sq (15A)","23:15 - Limekiln Rd (15A)","00:00 - Special to Garage","00:10 - Garage (Finish)"],"Z1|SU|037":["15:15 - Abbey St (41C)","16:45 - Swords Manor (41)","18:15 - Abbey St (41C)","19:35 - Special to Garage","20:10 - Garage (Break)","21:30 - Abbey St (41)","22:45 - Swords Manor (41C)","23:40 - Special to Garage","23:46 - Garage (Finish)"],"Z1|SU|038":["15:30 - Abbey St (41)","17:00 - Swords Manor (41C)","18:30 - Abbey St (Break)","19:35 - Townsend St (15B)","19:45 - Merrion Sq (15B)","20:45 - Stocking Ave (15B)","21:45 - Merrion Sq (15B)","22:45 - Stocking Ave (15B)","23:45 - Special to Garage","23:55 - Garage (Finish)"],"Z1|SU|039":["15:35 - Pearse St (15B)","16:45 - Stocking Ave (15B)","18:05 - Merrion Sq (15B)","19:15 - Stocking Ave (15B)","20:15 - Merrion Sq (15B)","20:25 - Pearse St (Break)","21:25 - Pearse St (15B)","22:15 - Stocking Ave (15B)","23:15 - Merrion Sq (15B)","00:05 - Special to Garage","00:50 - Garage (Finish)"],"Z1|SU|040":["15:40 - Pearse St (15A)","16:30 - Limekiln Rd (15A)","17:30 - Merrion Sq (15A)","18:30 - Limekiln Rd (15A)","19:30 - Merrion Sq (15A)","19:40 - Pearse St (Break)","20:40 - Pearse St (15A)","21:15 - Limekiln Rd (15A)","22:00 - Merrion Sq (15A)","22:45 - Limekiln Rd (15A)","23:30 - Merrion Sq (15A)","00:10 - Special to Garage","00:50 - Garage (Finish)"],"Z1|SU|041":["15:36 - Report (Garage)","15:45 - Abbey St (41C)","17:15 - Swords Manor (41)","18:45 - Abbey St (Break)","20:20 - Report (Garage)","21:00 - Swords Manor (41C)","22:15 - Abbey St (41C)","23:15 - Swords Manor (41C)","00:10 - Special to Garage","00:16 - Garage (Finish)"],"Z1|SU|042":["16:00 - Abbey St (41)","17:30 - Swords Manor (41C)","19:00 - Abbey St (Break)","20:15 - Abbey St (41C)","21:30 - Swords Manor (41C)","22:45 - Swords Manor (41B)","23:45 - Special to Garage","00:25 - Garage (Finish)"],"Z1|SU|043":["16:45 - Townsend St (15B)","17:05 - Merrion Sq (15B)","18:25 - Stocking Ave (15B)","19:25 - Special to Garage","19:40 - Garage (Break)","21:00 - Abbey St (41)","22:15 - Swords Manor (41C)","23:15 - Abbey St (41C)","00:10 - Special to Garage","00:40 - Garage (Finish)"],"Z1|SU|044":["17:00 - Abbey St (41)","18:30 - Swords Manor (41C)","19:45 - Abbey St (Break)","21:15 - Abbey St (41C)","22:30 - Swords Manor (41)","23:30 - Abbey St (41)","00:30 - Special to Garage","01:00 - Garage (Finish)"],"Z1|SU|045":["17:15 - Abbey St (41C)","18:45 - Swords Manor (41)","20:00 - Abbey St (41)","21:15 - Swords Manor (41)","22:25 - Special to Garage","22:31 - Garage (Finish)"],"Z1|SU|046":["17:30 - Abbey St (41)","19:00 - Swords Manor (41C)","20:15 - Abbey St (Break)","21:20 - Townsend St (15A)","21:30 - Merrion Sq (15A)","22:15 - Limekiln Rd (15A)","23:00 - Merrion Sq (15A)","23:45 - Special to Garage","00:25 - Garage (Finish)"],"Z1|SU|071":["10:00 - Abbey St (41)","11:15 - Swords Manor (41)","12:45 - Abbey St (Break)","13:45 - Abbey St (41C)","15:15 - Swords Manor (41)","16:57 - Abbey St (Finish)"],"Z1|SU|072":["10:46 - Report (Garage)","11:00 - Abbey St (41)","12:15 - Swords Manor (41)","13:40 - Abbey St (Break)","14:30 - Abbey St (41)","16:00 - Swords Manor (41C)","17:42 - Abbey St (Finish)"],"Z1|SU|073":["10:52 - Report (Garage)","11:15 - Merrion Sq (15B)","12:25 - Stocking Ave (15B)","13:45 - Merrion Sq (15B)","15:05 - Stocking Ave (15B)","16:05 - Townsend St (Break)","17:55 - Pearse St (15B)","18:55 - Special to Garage","19:40 - Garage (Finish)"],"Z1|SU|074":["11:15 - Abbey St (41C)","12:30 - Swords Manor (41C)","14:00 - Special to Garage","14:10 - Garage (Break)","15:25 - Townsend St (15B)","15:45 - Merrion Sq (15B)","17:05 - Stocking Ave (15B)","18:15 - Special to Garage","18:30 - Garage (Finish)"],"Z1|SU|075":["11:12 - Report (Garage)","12:05 - Stocking Ave (15B)","13:25 - Merrion Sq (15B)","14:45 - Stocking Ave (15B)","16:05 - Merrion Sq (15B)","16:15 - Pearse St (Break)","18:00 - Abbey St (41)","19:25 - Special to Garage","20:05 - Garage (Finish)"],"Z1|SU|091":["19:45 - Abbey St (41C)","20:55 - Special to Garage","21:35 - Garage (Break)","23:50 - Report (Garage)","00:30 - Swords Manor (41) NIGHT","01:30 - Abbey St (41)","02:30 - Swords Manor (41)","03:20 - Special to Garage","03:26 - Garage (Finish)"],"Z1|SU|092":["20:30 - Abbey St (41)","21:45 - Swords Manor (41)","23:00 - Abbey St (41)","00:00 - Swords Manor (41)","00:55 - Special to Garage","01:01 - Garage (Break)","02:24 - Report (Garage)","02:30 - Abbey St (41)","03:30 - Swords Manor (41)","04:30 - Abbey St (41)","05:25 - Special to Garage","05:55 - Garage (Finish)"],"Z1|SU|093":["20:45 - Abbey St (41C)","22:00 - Swords Manor (41)","23:05 - Special to Garage","23:15 - Garage (Break)","00:54 - Report (Garage)","01:00 - Abbey St (41)","02:00 - Swords Manor (41)","03:00 - Abbey St (41)","04:00 - Swords Manor (41)","04:55 - Special to Garage","05:01 - Garage (Finish)"],"Z1|SU|094":["21:36 - Report (Garage)","21:45 - Abbey St (41C)","23:00 - Swords Manor (41)","00:00 - Abbey St (41)","01:00 - Swords Manor (41)","01:55 - Special to Garage","02:01 - Garage (Break)","03:24 - Report (Garage)","03:30 - Abbey St (41)","04:30 - Swords Manor (41)","05:30 - Special to Garage","05:36 - Garage (Finish)"],"Z1|SU|095":["21:51 - Report (Garage)","22:00 - Abbey St (41)","23:05 - Special to Garage","23:45 - Garage (Break)","01:54 - Report (Garage)","02:00 - Abbey St (41)","03:00 - Swords Manor (41)","04:00 - Abbey St (41)","05:00 - Swords Manor (41)","06:05 - Special to Garage","06:11 - Garage (Finish)"],"Z1|SU|096":["22:17 - Report (Garage)","22:30 - Abbey St (41)","23:30 - Swords Manor (41)","00:30 - Abbey St (41)","01:30 - Swords Manor (41)","02:25 - Special to Garage","02:31 - Garage (Finish)"],"R150|W|251":["05:32 - Report (Garage)","06:20 - Limekiln Ave. (150)","07:15 - Hawkins St (150)","08:15 - Limekiln Ave. (V) (150)","09:30 - Hawkins St (150)","10:30 - Special to Garage","11:10 - Garage (Finish)"],"R150|W|252":["05:52 - Report (Garage)","06:40 - Limekiln Ave. (150)","07:35 - Hawkins St (150)","08:30 - Limekiln Ave. (V) (150)","09:30 - Special to Garage","09:50 - Garage (Break)","11:10 - Hawkins St (150)","12:00 - Limekiln Ave. (150)","13:00 - Special to Garage","13:20 - Garage (Finish)"],"R150|W|253":["06:07 - Report (Garage)","06:35 - Hawkins St (150)","07:30 - Limekiln Ave. (V) (150)","08:40 - Hawkins St (Break)","09:50 - Hawkins St (150)","10:40 - Limekiln Ave. (150)","11:30 - Hawkins St (150)","12:40 - Limekiln Ave. (150)","13:47 - Hawkins St (Finish)"],"R150|W|254":["06:12 - Report (Garage)","07:00 - Limekiln Ave. (150)","07:55 - Hawkins St (150)","09:00 - Limekiln Ave. (V) (150)","10:10 - Hawkins St (150)","11:00 - Limekiln Ave. (150)","12:07 - Hawkins St (Finish)"],"R150|W|255":["06:17 - Report (Garage)","07:15 - Limekiln Ave. (150)","08:25 - Hawkins St (150)","09:30 - Limekiln Ave. (150)","10:30 - Special to Garage","10:50 - Garage (Break)","12:10 - Hawkins St (150)","13:20 - Limekiln Ave. (150)","14:47 - Hawkins St (Finish)"],"R150|W|256":["06:27 - Report (Garage)","06:55 - Hawkins St (150)","07:45 - Limekiln Ave. (V) (150)","08:55 - Hawkins St (150)","10:00 - Limekiln Ave. (150)","11:10 - Special to Garage","11:30 - Garage (Break)","12:50 - Hawkins St (150)","14:00 - Limekiln Ave. (150)","15:27 - Hawkins St (Finish)"],"R150|W|257":["11:50 - Hawkins St (150)","13:00 - Limekiln Ave. (150)","13:50 - Hawkins St (150)","15:00 - Limekiln Ave. (150)","16:10 - Hawkins St (Break)","17:10 - Hawkins St (150)","18:25 - Limekiln Ave. (150)","19:10 - Hawkins St (150)","20:05 - Limekiln Ave. (150)","21:17 - Hawkins St (Finish)"],"R150|W|258":["11:32 - Report (Garage)","12:20 - Limekiln Ave. (150)","13:10 - Hawkins St (150)","14:20 - Limekiln Ave. (150)","15:30 - Hawkins St (Break)","16:25 - Hawkins St (150)","17:40 - Limekiln Ave. (150)","18:50 - Hawkins St (150)","19:45 - Special to Garage","20:30 - Garage (Finish)"],"R150|W|259":["12:07 - Report (Garage)","12:30 - Hawkins St (150)","13:40 - Limekiln Ave. (150)","14:50 - Hawkins St (150)","16:00 - Limekiln Ave. (150)","17:10 - Hawkins St (Break)","18:10 - Hawkins St (150)","19:15 - Limekiln Ave. (150)","20:00 - Hawkins St (150)","20:55 - Limekiln Ave. (150)","21:40 - Special to Garage","21:55 - Garage (Finish)"],"R150|W|260":["13:30 - Hawkins St (150)","14:40 - Limekiln Ave. (150)","15:50 - Hawkins St (150)","17:00 - Limekiln Ave. (150)","18:10 - Hawkins St (Break)","19:35 - Hawkins St (150)","20:30 - Limekiln Ave. (150)","21:47 - Hawkins St (Finish)"],"R150|W|261":["15:30 - Hawkins St (150)","16:40 - Limekiln Ave. (150)","17:55 - Hawkins St (150)","19:00 - Special to Garage","19:45 - Garage (Break)","21:00 - Hawkins St (150)","21:50 - Limekiln Ave. (150)","22:30 - Hawkins St (150)","23:20 - Limekiln Ave. (150)","00:00 - Special to Garage","00:20 - Garage (Finish)"],"R150|W|262":["15:47 - Report (Garage)","16:10 - Hawkins St (150)","17:20 - Limekiln Ave. (150)","18:30 - Hawkins St (150)","19:40 - Limekiln Ave. (150)","20:30 - Hawkins St (Break)","21:30 - Hawkins St (150)","22:20 - Limekiln Ave. (150)","23:00 - Hawkins St (150)","23:40 - Special to Garage","00:20 - Garage (Finish)"],"R150|W|263":["16:17 - Report (Garage)","16:40 - Hawkins St (150)","18:00 - Limekiln Ave. (150)","19:00 - Special to Garage (V) (Hawkins Street","19:15 - Garage (Break)","20:30 - Hawkins St (150)","21:20 - Limekiln Ave. (150)","22:00 - Hawkins St (150)","22:50 - Limekiln Ave. (150)","23:30 - Hawkins St (150)","00:10 - Special to Garage","00:50 - Garage (Finish)"],"R150|W|271":["06:52 - Report (Garage)","08:00 - Limekiln Ave. (V) (150)","09:10 - Hawkins St (150)","10:20 - Limekiln Ave. (150)","11:10 - Hawkins St (Break)","13:50 - Report (Garage)","14:10 - Hawkins St (150)","15:20 - Limekiln Ave. (150)","16:25 - Special to Garage","16:45 - Garage (Finish)"],"R150|W|272":["07:37 - Report (Garage)","08:45 - Limekiln Ave. (V)","09:50 - Hawkins St (Break)","14:30 - Hawkins St (150)","15:40 - Limekiln Ave. (150)","16:55 - Hawkins St (150)","18:10 - Special to Garage","18:50 - Garage (Finish)"],"R150|W|273":["07:42 - Report (Garage) (150)","08:10 - Hawkins St (150)","09:15 - Limekiln Ave. (150)","10:30 - Hawkins St (150)","11:20 - Limekiln Ave. (150)","12:10 - Hawkins St (Break)","15:10 - Hawkins St (150)","16:20 - Limekiln Ave. (150)","17:25 - Hawkins St (150)","18:40 - Special to Garage","19:20 - Garage (Finish)"],"R150|W|274":["08:40 - Hawkins St (150)","09:45 - Limekiln Ave. (150)","10:50 - Hawkins St (150)","11:40 - Limekiln Ave. (150)","12:50 - Hawkins St (Break)","17:15 - Report (Garage)","17:40 - Hawkins St (150)","18:50 - Limekiln Ave. (150)","19:52 - Hawkins St (Finish)"],"R150|SA|256":["12:35 - Hawkins St (150)","13:40 - Limekiln Ave. (150)","14:35 - Hawkins St (150)","15:40 - Limekiln Ave. (150)","16:35 - Hawkins St (Break)","18:15 - Hawkins St (150)","19:20 - Limekiln Ave. (150)","20:00 - Hawkins St (150)","20:45 - Limekiln Ave. (150)","21:47 - Hawkins St (Finish)"],"R150|SA|251":["06:12 - Report (Garage)","07:00 - Limekiln Ave. (150)","07:45 - Hawkins St (150)","08:30 - Limekiln Ave. (150)","09:15 - Hawkins St (150)","10:00 - Limekiln Ave. (150)","10:55 - Special to Garage","11:15 - Garage (Finish)"],"R150|SA|252":["06:22 - Report (Garage)","06:45 - Hawkins St (150)","07:30 - Limekiln Ave. (150)","08:15 - Hawkins St (150)","09:00 - Limekiln Ave. (150)","09:45 - Hawkins St (Break)","11:20 - Report (Garage)","12:00 - Limekiln Ave. (150)","12:55 - Hawkins St (150)","14:00 - Limekiln Ave. (150)","15:12 - Hawkins St (Finish)"],"R150|SA|253":["06:52 - Report (Garage)","07:15 - Hawkins St (150)","08:00 - Limekiln Ave. (150)","08:45 - Hawkins St (150)","09:30 - Limekiln Ave. (150)","10:45 - Hawkins St (Break)","13:35 - Hawkins St (150)","14:40 - Limekiln Ave. (150)","15:52 - Hawkins St (Finish)"],"R150|SA|254":["09:45 - Hawkins St (150)","10:30 - Limekiln Ave. (150)","11:35 - Hawkins St (150)","12:40 - Limekiln Ave. (150)","13:35 - Hawkins St (Break)","15:15 - Hawkins St (150)","16:20 - Limekiln Ave. (150)","17:32 - Hawkins St (Finish)"],"R150|SA|255":["11:52 - Report (Garage)","12:15 - Hawkins St (150)","13:20 - Limekiln Ave. (150)","14:15 - Hawkins St (150)","15:20 - Limekiln Ave. (150)","16:15 - Hawkins St (Break)","17:15 - Hawkins St (150)","18:20 - Limekiln Ave. (150)","19:00 - Hawkins St (150)","19:50 - Special to Garage","20:35 - Garage (Finish)"],"R150|SA|257":["15:35 - Hawkins St (150)","16:40 - Limekiln Ave. (150)","17:35 - Hawkins St (150)","18:40 - Limekiln Ave. (150)","19:30 - Hawkins St (Break)","20:30 - Hawkins St (150)","21:15 - Limekiln Ave. (150)","22:00 - Hawkins St (150)","22:45 - Limekiln Ave. (150)","23:30 - Hawkins St (150)","00:10 - Special to Garage","00:55 - Garage (Finish)"],"R150|SA|258":["16:15 - Hawkins St (150)","17:20 - Limekiln Ave. (150)","18:15 - Hawkins St (Break)","19:30 - Hawkins St (150)","20:15 - Limekiln Ave. (150)","21:00 - Hawkins St (150)","21:45 - Limekiln Ave. (150)","22:30 - Hawkins St (150)","23:20 - Limekiln Ave. (150)","00:05 - Special to Garage","00:20 - Garage (Finish)"],"R150|SA|259":["16:35 - Hawkins St (150)","17:40 - Limekiln Ave. (150)","18:35 - Hawkins St (150)","19:45 - Limekiln Ave. (150)","20:30 - Hawkins St (Break)","21:30 - Hawkins St (150)","22:15 - Limekiln Ave. (150)","23:00 - Hawkins St (150)","23:45 - Special to Garage","00:25 - Garage (Finish)"],"R150|SA|271":["09:47 - Report (Garage)","10:15 - Hawkins St (150)","11:00 - Limekiln Ave. (150)","11:55 - Hawkins St (150)","13:00 - Limekiln Ave. (150)","13:55 - Hawkins St (Break)","14:55 - Hawkins St (150)","16:00 - Limekiln Ave. (150)","16:55 - Hawkins St (150)","18:00 - Limekiln Ave. (150)","19:00 - Special to Garage","19:15 - Garage (Finish)"],"R150|SA|272":["10:45 - Hawkins St (150)","11:30 - Limekiln Ave. (150)","12:35 - Hawkins St (Break)","13:55 - Hawkins St (150)","15:00 - Limekiln Ave. (150)","15:55 - Hawkins St (150)","17:00 - Limekiln Ave. (150)","18:12 - Hawkins St (Finish)"],"R150|SA|273":["10:47 - Report (Garage)","11:15 - Hawkins St (150)","12:20 - Limekiln Ave. (150)","13:15 - Hawkins St (150)","14:20 - Limekiln Ave. (150)","15:15 - Hawkins St (Break)","17:55 - Hawkins St (150)","19:00 - Limekiln Ave. (150)","19:45 - Special to Garage","20:00 - Garage (Finish)"],"R150|SU|254":["13:30 - Hawkins St (150)","14:30 - Limekiln Ave. (150)","15:30 - Hawkins St (150)","16:30 - Limekiln Ave. (150)","17:30 - Hawkins St (Break)","18:30 - Hawkins St (150)","19:30 - Limekiln Ave. (150)","20:47 - Hawkins St (Finish)"],"R150|SU|251":["07:27 - Report (Garage)","08:15 - Limekiln Ave. (150)","09:00 - Hawkins St (150)","09:45 - Limekiln Ave. (150)","10:30 - Hawkins St (150)","11:15 - Limekiln Ave. (150)","12:17 - Hawkins St (Finish)"],"R150|SU|252":["07:52 - Report (Garage)","08:45 - Limekiln Ave. (150)","09:30 - Hawkins St (150)","10:15 - Limekiln Ave. (150)","11:00 - Hawkins St (150)","11:45 - Limekiln Ave. (150)","12:30 - Special to Garage","12:40 - Garage (Finish)"],"R150|SU|253":["08:02 - Report (Garage)","08:30 - Hawkins St (150)","09:15 - Limekiln Ave. (150)","10:00 - Hawkins St (150)","10:45 - Limekiln Ave. (150)","11:30 - Hawkins St (150)","12:30 - Limekiln Ave. (150)","13:47 - Hawkins St (Finish)"],"R150|SU|255":["15:00 - Hawkins St (150)","16:00 - Limekiln Ave. (150)","17:00 - Hawkins St (Break)","19:30 - Hawkins St (150)","20:15 - Limekiln Ave. (150)","21:00 - Hawkins St (150) (150)","20:45 - Limekiln Ave. (150) Ave. (150)","23:30 - Hawkins St (150) (150)","23:20 - Limekiln Ave. (150) Ave. (150)","00:05 - Special to Garage St (Break)","00:15 - Garage (Finish)"],"R150|SU|256":["16:30 - Hawkins St (150)","17:30 - Limekiln Ave. (150)","18:30 - Hawkins St (Break)","20:00 - Hawkins St (150)","20:45 - Limekiln Ave. (150)","21:30 - Hawkins St (150)","22:15 - Limekiln Ave. (150)","23:00 - Hawkins St (150)","23:45 - Special to Garage","00:20 - Garage (Finish)"],"R150|SU|257":["17:30 - Hawkins St (150)","18:30 - Limekiln Ave. (150)","19:30 - Hawkins St (Break)","20:30 - Hawkins St (150)","21:15 - Limekiln Ave. (150)","22:00 - Hawkins St (150)","22:45 - Limekiln Ave. (150)","23:30 - Hawkins St (150)","00:15 - Special to Garage","00:50 - Garage (Finish)"],"R150|SU|271":["11:17 - Report (Garage)","12:00 - Limekiln Ave. (150)","13:00 - Hawkins St (150)","14:00 - Limekiln Ave. (150)","15:00 - Hawkins St (Break)","16:00 - Hawkins St (150) (3X)","17:00 - Limekiln Ave. (150)","18:17 - Hawkins St (Finish) (150) Ave. (150) (150) Ave. (150) (Break) (150) Ave. (150) Garage"],"R150|SU|272":["12:00 - Hawkins St (150)","13:00 - Limekiln Ave. (150)","14:00 - Hawkins St (150)","15:00 - Limekiln Ave. (150)","16:00 - Hawkins St (Break)","17:00 - Hawkins St (150)","18:00 - Limekiln Ave. (150)","19:00 - Hawkins St (150)","19:45 - Limekiln Ave. (150)","20:30 - Special to Garage","20:45 - Garage (Finish)"],"R150|SU|273":["12:07 - Report (Garage)","12:30 - Hawkins St (150)","13:30 - Limekiln Ave. (150)","14:30 - Hawkins St (150)","15:30 - Limekiln Ave. (150)","16:30 - Hawkins St (Break)","18:00 - Hawkins St (150)","19:00 - Limekiln Ave. (150)","20:17 - Hawkins St (Finish)"],"SK|W|201":["05:27 - Arrive to Skerries Garage to check all the Buses","05:27 - Report (take Bus 1) (Skerries Garage)","05:45 - Skerries (33)","07:24 - Abbey St (33) (to Balbriggan)","09:20 - Spl to Skerries Garage (from Balbriggan)","09:30 - Skerries Garage (Finish)"],"SK|W|202":["06:12 - Report (take Bus 2) (Skerries Garage)","06:35 - Balbriggan (33)","08:30 - Spl to Skerries Garage (from Abbey St)","09:20 - Skerries Garage (Break)","10:23 - Report (take Bus 1) (Skerries Garage)","10:36 - Skerries (33)","12:20 - Spl to Summerhill to REFUEL (from Abbey St)","13:20 - Abbey St (33) (to Balbriggan)","15:20 - Spl to Skerries Garage (from Balbriggan)","15:35 - Skerries Garage (Finish)"],"SK|W|203":["07:17 - Report (take Bus 4) (Skerries Garage)","07:35 - Skerries (33)","09:35 - Spl to Summerhill to REFUEL (from Abbey St)","10:20 - Abbey St (33) (to Balbriggan)","12:15 - Spl to Skerries Garage (from Balbriggan)","12:25 - Skerries Garage (Finish)"],"SK|W|204":["11:53 - Report (take Bus 3) (Skerries Garage)","12:06 - Skerries (33)","13:50 - Spl to Skerries Garage (from Abbey St) 33","14:40 - Skerries Garage (Break) 33","16:22 - Skerries (33 to Balbriggan) (take over bus in sevice)","17:11 - Balbriggan (33)","19:23 - Abbey St (33) (to Balbriggan)","21:20 - Spl to Skerries Garage (from Balbriggan)","21:30 - Skerries Garage (Finish)"],"SK|W|205":["14:47 - Report (take Bus 3) (Skerries Garage)","15:00 - Skerries (33)","16:50 - Abbey St (33) (to Skerries)","19:00 - Spl to Skerries Garage (from Skerries)","19:10 - Skerries Garage (Break)","20:12 - Report (take Bus 3) (Skerries Garage)","20:25 - Skerries (33)","21:50 - Spl to Summerhill to REFUEL (from Abbey St)","22:34 - Abbey St (33) (to Skerries)","00:05 - Spl to Skerries Garage (from Skerries)","00:10 - Skerries Garage (Finish)"],"SK|W|206":["16:23 - Report (take Bus 2) (Skerries Garage)","16:36 - Skerries (33)","18:21 - Abbey St (33) (to Skerries)","20:15 - Spl to Skerries Garage (from Skerries)","20:20 - Skerries Garage (Break)","21:26 - Report (take Bus 2) (Skerries Garage)","21:44 - Balbriggan (33)","23:30 - Abbey St (33) (to Skerries)","01:00 - Spl to Skerries Garage (from Skerries)","01:05 - Skerries Garage (Finish)"],"SK|W|211":["06:42 - Report (take Bus 3) (Skerries Garage)","07:00 - Skerries (33)","09:00 - Spl to Skerries Garage (from Abbey St)","09:45 - Skerries Garage (Break)","12:23 - Report (take Bus 4) (Skerries Garage)","12:41 - Balbriggan (33)","14:45 - Abbey St (33) (to Balbriggan)","16:25 - Skerries (Finish (handover bus in sevice))"],"SK|W|212":["09:17 - Report (take Bus 2) (Skerries Garage)","09:41 - Balbriggan (33)","11:40 - Spl to Summerhill to REFUEL (from Abbey St)","12:00 - Spl to Skerries Garage (from Skerries)","12:50 - Skerries Garage (Break)","16:27 - Report (take Bus 1) (Skerries Garage)","17:33 - Abbey St (33) (to Balbriggan)","19:45 - Spl to Skerries Garage (from Balbriggan)","19:55 - Skerries Garage (Finish)"],"SK|SA|201":["05:22 - Arrive to Skerries Garage to check all the Buses","05:22 - Report (take Bus 1) (Skerries Garage)","05:44 - Balbriggan (33)","07:34 - Abbey St (33) (to Balbriggan)","09:41 - Balbriggan (33)","09:51 - Skerries (Finish (handover bus in sevice))"],"SK|SA|202":["06:26 - Report (take Bus 2) (Skerries Garage)","06:44 - Balbriggan (33)","08:23 - Spl to Summerhill to REFUEL (from Abbey St)","08:56 - Abbey St (33) (to Balbriggan)","10:43 - Spl to Skerries Garage (from Balbriggan)","10:58 - Skerries Garage (Break)","12:31 - Report (take Bus 2) (Skerries Garage)","13:17 - Abbey St (33) (to Balbriggan)","15:03 - Spl to Skerries Garage (from Balbriggan)","15:18 - Skerries Garage (Finish)"],"SK|SA|203":["12:18 - Report (take Bus 4) (Skerries Garage)","12:41 - Balbriggan (33)","14:47 - Abbey St (33) (to Balbriggan)","16:37 - Spl to Skerries Garage (from Balbriggan)","16:57 - Skerries Garage (Break)","18:00 - Report (take Bus 4) (Skerries Garage)","18:53 - Spl to Summerhill to REFUEL (from Abbey St)","19:30 - Abbey St (33) (to Balbriggan)","21:32 - Spl to Skerries Garage (from Balbriggan)","21:42 - Skerries Garage (Finish)"],"SK|SA|204":["15:23 - Report (take Bus 3) (Skerries Garage)","15:41 - Balbriggan (33)","17:50 - Abbey St (33) (to Balbriggan)","19:45 - Spl to Skerries Garage (from Balbriggan)","20:00 - Skerries Garage (Break)","21:31 - Report (take Bus 1) (Skerries Garage)","21:44 - Balbriggan (33)","23:30 - Abbey St (33) (to Skerries)","00:50 - Spl to Skerries Garage (from Skerries)","01:00 - Skerries Garage (Finish)"],"SK|SA|211":["08:07 - Report (take Bus 3) (Skerries Garage)","08:25 - Skerries (33)","10:00 - Spl to Summerhill to REFUEL (from Abbey St)","10:26 - Abbey St (33) (to Balbriggan)","12:12 - Spl to Skerries Garage (from Balbriggan)","12:27 - Skerries Garage (Break)","13:53 - Report (take Bus 1) (Skerries Garage)","14:11 - Balbriggan (33)","15:54 - Spl to Summerhill to REFUEL (from Abbey St)","16:24 - Spl to Skerries Garage (from Summerhill Garage)","17:14 - Skerries Garage (Finish)"],"SK|SA|212":["09:48 - Skerries (33 to Abbey St) (take over bus in sevice)","11:51 - Abbey St (33) (to Balbriggan)","13:37 - Spl to Skerries Garage (from Balbriggan)","13:52 - Skerries Garage (Break)","16:55 - Report (take Bus 2) (Skerries Garage)","17:11 - Balbriggan (33)","19:00 - Spl to Skerries Garage (from Abbey St)","19:50 - Skerries Garage (Finish)"],"SK|SU|201":["07:17 - Arrive to Skerries Garage to check all the Buses","07:17 - Report (take Bus 1) (Skerries Garage)","07:44 - Balbriggan (33)","09:22 - Spl to Summerhill to REFUEL (from Abbey St)","10:26 - Abbey St (33) (to Balbriggan)","12:41 - Balbriggan (33)","12:54 - Skerries (Finish) (handover bus in sevice))"],"SK|SU|202":["07:28 - Report (take Bus 2) (Skerries Garage)","08:25 - Abbey St (33) (to Skerries)","09:55 - Skerries (33)","11:50 - Abbey St (33) (to Balbriggan)","13:13 - Skerries (Finish (handover bus in sevice))"],"SK|SU|203":["12:58 - Skerries (33 to Balbriggan) (take over bus in sevice)","14:11 - Balbriggan (33)","16:10 - Spl to Skerries Garage (from Abbey St)","17:00 - Skerries Garage (Break)","18:24 - Report (take Bus 2) (Skerries Garage)","18:44 - Balbriggan (33)","20:24 - Spl to Summerhill to REFUEL (from Abbey St)","20:45 - Spl to Skerries Garage (from Summerhill Garage)","21:38 - Skerries Garage (Finish)"],"SK|SU|204":["15:14 - Report (take Bus 4) (Skerries Garage)","15:41 - Balbriggan (33)","17:53 - Abbey St (33) (to Balbriggan)","19:53 - Spl to Skerries Garage (from Balbriggan)","20:08 - Skerries Garage (Break)","21:24 - Report (take Bus 4) (Skerries Garage)","21:44 - Balbriggan (33)","23:10 - Spl to Summerhill to REFUEL (from Abbey St)","23:30 - Abbey St (33) (to Skerries)","00:55 - Spl to Skerries Garage (from Skerries)","01:05 - Skerries Garage (Finish)"],"SK|SU|205":["15:17 - Report (take Bus 3) (Skerries Garage)","16:18 - Abbey St (33) (to Balbriggan)","18:13 - Spl to Skerries Garage (from Balbriggan)","18:28 - Skerries Garage (Break)","19:54 - Report (take Bus 1) (Skerries Garage)","20:14 - Balbriggan (33)","22:34 - Abbey St (33) (to Skerries)","00:11 - Spl to Skerries Garage (from Skerries)","00:21 - Skerries Garage (Finish)"],"SK|SU|211":["10:49 - Report (take Bus 3) (Skerries Garage)","11:11 - Balbriggan (33)","12:44 - Spl to Summerhill to REFUEL (from Abbey St)","13:17 - Abbey St (33) (to Balbriggan)","15:08 - Spl to Skerries Garage (from Balbriggan)","15:18 - Skerries Garage (Break)","16:52 - Report (take Bus 1) (Skerries Garage)","17:11 - Balbriggan (33)","18:55 - Spl to Skerries Garage (from Abbey St)","19:43 - Skerries Garage (Finish)"],"SK|SU|212":["12:39 - Skerries (33 to Abbey St) (take over bus in sevice)","14:48 - Abbey St (33) (to Balbriggan)","16:38 - Spl to Skerries Garage (from Balbriggan)","16:48 - Skerries Garage (Break)","18:30 - Report (take Bus 3) (Skerries Garage)","19:30 - Abbey St (33) (to Balbriggan)","21:22 - Spl to Skerries Garage (from Balbriggan)","21:28 - Skerries Garage (Finish)"]};


const ZONES = ["Zone 1", "Zone 2", "Skerries", "150"];
const DAY_OFF_TYPES = ["Annual Leave", "Sick Day", "Rest Day", "Force Majeure", "Self Cert"];
const FIXED_DUTY_TYPES = [
  { key: "cpc", label: "CPC/Training", full: "CPC/Training (Certificate of Professional Competence)", roster: "CPC/Training", hours: 7 + 40/60, breakHours: 1 },
  { key: "stdSpare", label: "Standard Spare", roster: "Standard Spare", hours: 7 + 40/60, breakHours: 1 },
  { key: "workSpare", label: "Workout Spare", roster: "Workout Spare", hours: 5 + 30/60, breakHours: 0 },
];
const MAX_HOURS = 190 + 4/60;
const MAX_SUNDAY = 14.5;

function getDayType(s) {
  const day = new Date(s + "T12:00:00").getDay();
  return day === 0 ? "sunday" : day === 6 ? "saturday" : "weekday";
}
function addDays(s, n) {
  const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDate(s) {
  return new Date(s + "T12:00:00").toLocaleDateString("en-IE", {weekday:"short",day:"numeric",month:"short"});
}
function fmtShort(s) {
  return new Date(s + "T12:00:00").toLocaleDateString("en-IE", {day:"numeric",month:"short"});
}
function fmtLong(s) {
  return new Date(s + "T12:00:00").toLocaleDateString("en-IE", {day:"numeric",month:"long",year:"numeric"});
}
function fmtHrs(h) {
  if (!h) return "0h";
  const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}
function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function thisSunday() {
  const d = new Date(), day = d.getDay(); d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
// Sunday of the week containing an arbitrary date string (not just today's week)
function sundayOf(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
function getDuties(zone, dayType) { return DUTIES.filter(d => d.z === zone && d.t === dayType); }
// DUTIES' `rl` field holds each duty's DEPART location (not "report location"
// despite the name — established during the running-board Report/Depart fix).
// Returns null for Spare/Fixed-type shifts (no fixed depart location) or if
// no matching roster duty is found.
function shiftDepartLocation(shift) {
  if (shift.isSpare || shift.fixedType) return null;
  const duty = DUTIES.find(d => d.z === shift.zone && d.t === shift.dayType && d.r === shift.roster);
  return duty ? duty.rl : null;
}
function dutyLabel(d) { return `${d.r} · ${d.s}–${d.e} (${fmtHrs(d.w)})`; }
function parseTimeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function calcSpreadover(report, signOff) {
  return +((parseTimeToMins(signOff) - parseTimeToMins(report)) / 60).toFixed(2);
}
// Adds a fixed duration (in hours) to a start time, returning "HH:MM" (hour may be >=24 for next day)
function addDuration(startTime, durationHours) {
  if (!startTime) return "00:00";
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = (h * 60 + m) + Math.round(durationHours * 60);
  const fh = Math.floor(totalMin / 60), fm = totalMin % 60;
  return `${String(fh).padStart(2,"0")}:${String(fm).padStart(2,"0")}`;
}
function maxConsec(shifts) {
  if (!shifts?.length) return 0;
  const dates = [...new Set(shifts.map(s => s.date))].sort();
  if (!dates.length) return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]+"T12:00:00") - new Date(dates[i-1]+"T12:00:00")) / 86400000;
    if (diff === 1) { cur++; if (cur > max) max = cur; } else cur = 1;
  }
  return max;
}
function dayOffTally(daysOff) {
  const t = {}; DAY_OFF_TYPES.forEach(x => t[x] = 0);
  (daysOff || []).forEach(d => { if (t[d.type] !== undefined) t[d.type]++; });
  return t;
}
function compColor(current, max) {
  const p = current / max;
  return p >= 1 ? DANGER : p >= 0.8 ? "#f59e0b" : SUCCESS;
}
function wkStats(shifts, daysOff, wStart) {
  const wEnd = addDays(wStart, 6);
  const ws = (shifts||[]).filter(s => s.date >= wStart && s.date <= wEnd);
  const wd = (daysOff||[]).filter(d => d.date >= wStart && d.date <= wEnd);
  const compliance = ws.filter(s => !s.isRestDay);
  // Compliance figures use paid Work hours (walking/driving time), not full
  // spreadover — spreadover includes the unpaid break, which doesn't count
  // toward the 190h/14h30m limits. Work hours come from the xlsx roster source.
  const overtime = +ws.reduce((a,x) => {
    if (x.isRestDay) return a + (x.workHours||0);
    return a + (x.overtimeHours||0);
  }, 0).toFixed(2);
  return {
    shifts: ws, daysOff: wd, start: wStart, end: wEnd,
    total: +compliance.reduce((a,x) => a + (x.workHours||0), 0).toFixed(2),
    sunday: +compliance.filter(s => getDayType(s.date)==="sunday").reduce((a,x) => a + (x.workHours||0), 0).toFixed(2),
    overtime
  };
}
// Fixed rest-day pattern, by week-of-period (0=Sun...6=Sat). Same every 5-week period.
let FIXED_REST_PATTERN = [
  [0, 1], // Week 1: Sunday, Monday
  [4, 0], // Week 2: Thursday, Sunday
  [2, 6], // Week 3: Tuesday, Saturday
  [5, 0], // Week 4: Friday, Sunday
  [3, 6], // Week 5: Wednesday, Saturday
];
function fixedRestDates(periodStartDate) {
  const dates = [];
  FIXED_REST_PATTERN.forEach((weekdays, wIdx) => {
    const weekStart = addDays(periodStartDate, wIdx * 7);
    weekdays.forEach(wd => dates.push(addDays(weekStart, wd)));
  });
  return dates;
}
// Merges the fixed rest days into daysOff — skipped for any date that already
// has a real shift or day-off logged (a swap), or was explicitly removed.
function withFixedRestDays(startDate, daysOff, shifts, removedFixed) {
  const removed = new Set(removedFixed || []);
  const taken = new Set([
    ...(daysOff || []).map(d => d.date),
    ...(shifts || []).map(s => s.date),
  ]);
  const virtual = fixedRestDates(startDate)
    .filter(d => !taken.has(d) && !removed.has(d))
    .map(d => ({ id: `fixed-${d}`, date: d, type: "Rest Day", fixed: true }));
  return [...(daysOff || []), ...virtual];
}
function pStats(p) {
  const mergedDaysOff = withFixedRestDays(p.startDate, p.daysOff||[], p.shifts||[], p.removedFixedRestDates);
  const weeks = Array.from({length:5}, (_, i) => wkStats(p.shifts||[], mergedDaysOff, addDays(p.startDate, i*7)));
  return {
    weeks,
    total: +weeks.reduce((a, w) => a + w.total, 0).toFixed(2),
    sunday: +weeks.reduce((a, w) => a + w.sunday, 0).toFixed(2),
    overtime: +weeks.reduce((a, w) => a + w.overtime, 0).toFixed(2),
    tally: dayOffTally(mergedDaysOff),
    consec: maxConsec(p.shifts)
  };
}
function inPeriod(date, p) { return date >= p.startDate && date <= addDays(p.startDate, 34); }
// Checks the active period first — periods are meant to be strictly
// sequential (never overlapping), but real historical data created before
// the 2026-07-16 startNewPeriod fix can still have an archived period whose
// range overlaps the current one. Without this, a plain array .find() could
// silently resolve a date to the wrong (older, stale) period.
function periodForDate(periods, date, activePeriodId) {
  const active = activePeriodId && periods.find(p => p.id === activePeriodId);
  if (active && inPeriod(date, active)) return active;
  return periods.find(p => inPeriod(date, p)) || null;
}
// Resolves what (if anything) is logged for a single date within a period —
// a shift, a day off (including auto-merged fixed rest days), or nothing.
// Dates outside the period's range are treated identically to "nothing
// logged" per the Home screen carousel spec — no separate error state.
function dayInfo(period, date) {
  if (!period || !inPeriod(date, period)) return { status: "unlogged", date };
  const shift = (period.shifts || []).find(s => s.date === date);
  if (shift) return { status: "shift", date, shift };
  const mergedDaysOff = withFixedRestDays(period.startDate, period.daysOff || [], period.shifts || [], period.removedFixedRestDates);
  const dayOff = mergedDaysOff.find(d => d.date === date);
  if (dayOff) return { status: "dayoff", date, dayOff };
  return { status: "unlogged", date };
}

async function loadData() {
  const r = localStorage.getItem("dbus_v3");
  if (!r) return {data:null, corrupted:false};
  try { return {data:JSON.parse(r), corrupted:false}; }
  catch { return {data:null, corrupted:true}; }
}
async function saveData(data) {
  try { localStorage.setItem("dbus_v3", JSON.stringify(data)); return true; }
  catch(e) { console.error(e); return false; }
}

// ─── ROSTER DATA (duties, running boards, fixed rest pattern) ─────────────────
// DUTIES/SEQ/FIXED_REST_PATTERN above are the bundled fallback — always
// available offline, from the moment the app first loads. On boot we also try
// to fetch a fresher copy so a roster change (new duty, timing fix, rest-day
// pattern update) can go live for every driver by editing one JSON file and
// pushing it, with no app rebuild or store update required. If every fetch
// attempt fails (offline, blocked host), the bundled data above just keeps
// being used — this never blocks or breaks the app.
const ROSTER_CACHE_KEY = "dbus_roster_cache";
const ROSTER_REMOTE_URL = "https://raw.githubusercontent.com/philiproche1-web/DB-Shift-Tracker/main/public/roster-data.json";
const ROSTER_LOCAL_URL = "/roster-data.json";

function isValidRosterPayload(d) {
  return !!d && Array.isArray(d.duties) && d.duties.length > 0
    && d.seq && typeof d.seq === "object"
    && Array.isArray(d.fixedRestPattern) && d.fixedRestPattern.length > 0;
}
async function fetchRosterWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {signal: ctrl.signal, cache: "no-store"});
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}
async function loadRosterData() {
  let data = await fetchRosterWithTimeout(ROSTER_REMOTE_URL, 4000);
  if (!isValidRosterPayload(data)) data = await fetchRosterWithTimeout(ROSTER_LOCAL_URL, 2500);
  if (isValidRosterPayload(data)) {
    try { localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(data)); } catch {}
    return data;
  }
  try {
    const cached = JSON.parse(localStorage.getItem(ROSTER_CACHE_KEY) || "null");
    if (isValidRosterPayload(cached)) return cached;
  } catch {}
  return null;
}

// ─── BACKUP NUDGE ───────────────────────────────────────────────────────────────
// A lost phone or a cleared cache is the single most damaging thing that can
// happen to a localStorage-only app — this tracks when the driver last
// exported a backup so Home can nudge them before that happens, not after.
const BACKUP_DATE_KEY = "dbus_last_backup";
const BACKUP_SNOOZE_KEY = "dbus_backup_snooze_until";
function runExportBackup() {
  try {
    const data = localStorage.getItem("dbus_v3");
    if (!data) return {ok:false, reason:"No data to export yet."};
    const blob = new Blob([data], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ShiftTracker-backup-${today()}.json`; a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem(BACKUP_DATE_KEY, today());
    return {ok:true};
  } catch { return {ok:false, reason:"Export failed — try again."}; }
}
function daysSinceLastBackup() {
  const last = localStorage.getItem(BACKUP_DATE_KEY);
  if (!last) return null;
  return Math.round((new Date(today()+"T12:00:00") - new Date(last+"T12:00:00")) / 86400000);
}
function isBackupNudgeSnoozed() {
  const until = localStorage.getItem(BACKUP_SNOOZE_KEY);
  return !!until && today() < until;
}
function snoozeBackupNudge(days) {
  try { localStorage.setItem(BACKUP_SNOOZE_KEY, addDays(today(), days)); } catch {}
}

// ─── SHIFT REMINDERS (opt-in, foreground-only) ─────────────────────────────────
// There's no backend here, so there's no way to notify a driver who hasn't
// opened the app — these fire the moment a relevant condition is true on a
// screen they're already looking at, deduped per day/period so they don't
// repeat every time the app is reopened. Settings copy is upfront that this
// only works while the app is open; a real "notify while closed" feature
// would need a small push-capable backend, which doesn't exist yet.
function notifyOnce(dedupeKey, title, body) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(dedupeKey)) return;
    new Notification(title, {body, icon:"/icon-192.png"});
    localStorage.setItem(dedupeKey, "1");
  } catch {}
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
// let (not const) so theme changes can mutate them and trigger re-render
let BG="#07090F",CARD="#0D1321",BORDER="#1A2438",CARD2="#141B2D";
let TEXT="#FFFFFF",MUTED="#8C99B8";
const ACCENT="#FFCD00",SUCCESS="#00C896",DANGER="#FF4455";

let currentThemeIsDark = true;

const DARK  = {BG:"#07090F",CARD:"#0D1321",BORDER:"#1A2438",CARD2:"#141B2D",TEXT:"#FFFFFF",MUTED:"#8C99B8",INPUT:"#0A0E1A"};
const LIGHT = {BG:"#F5F7FA",CARD:"#FFFFFF",BORDER:"#D8DFE8",CARD2:"#EEF1F5",TEXT:"#0D1321",MUTED:"#64748B",INPUT:"#FFFFFF"};

let cardStyle={background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:18};
let inputStyle={background:DARK.INPUT,border:`1px solid ${BORDER}`,borderRadius:8,padding:"12px 14px",color:TEXT,fontSize:16,width:"100%",boxSizing:"border-box",WebkitAppearance:"none"};
let btnStyle={background:ACCENT,color:"#07090F",border:"none",borderRadius:12,padding:"16px 20px",fontSize:16,fontWeight:800,cursor:"pointer",width:"100%",letterSpacing:"0.3px"};
const tag=(c)=>({background:c+"22",color:c,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,display:"inline-block",letterSpacing:"0.5px",textTransform:"uppercase"});

function applyTheme(appearance, forceUpdate) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = appearance==="dark"||(appearance==="system"&&prefersDark);
  currentThemeIsDark = dark;
  const t = dark ? DARK : LIGHT;
  BG=t.BG; CARD=t.CARD; BORDER=t.BORDER; CARD2=t.CARD2; TEXT=t.TEXT; MUTED=t.MUTED;
  cardStyle  = {background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:18};
  inputStyle = {background:t.INPUT,border:`1px solid ${BORDER}`,borderRadius:8,padding:"12px 14px",color:TEXT,fontSize:16,width:"100%",boxSizing:"border-box",WebkitAppearance:"none"};
  btnStyle   = {background:ACCENT,color:"#07090F",border:"none",borderRadius:12,padding:"16px 20px",fontSize:16,fontWeight:800,cursor:"pointer",width:"100%",letterSpacing:"0.3px"};
  if(forceUpdate) forceUpdate();
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
// Bus logo mark — clean SVG, replaces emoji
function BusLogo({size=40}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="8" y="10" width="32" height="26" rx="5" fill={ACCENT}/>
      <rect x="11" y="15" width="11" height="8" rx="1.5" fill="#07090F"/>
      <rect x="26" y="15" width="11" height="8" rx="1.5" fill="#07090F"/>
      <circle cx="16" cy="38" r="3.5" fill={ACCENT}/>
      <circle cx="32" cy="38" r="3.5" fill={ACCENT}/>
      <circle cx="16" cy="38" r="1.5" fill="#07090F"/>
      <circle cx="32" cy="38" r="1.5" fill="#07090F"/>
      <rect x="13" y="28" width="22" height="3" rx="1.5" fill="#07090F" opacity="0.5"/>
    </svg>
  );
}

// Page header with gradient — used on every screen for consistency
function PageHeader({eyebrow, title, subtitle, right, onBack}) {
  return (
    <div style={{padding:"24px 20px 18px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,minWidth:0}}>
          {onBack && (
            <button onClick={onBack} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0,marginTop:2}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <div style={{minWidth:0}}>
            {eyebrow && <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>{eyebrow}</p>}
            <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.5px",lineHeight:1.1}}>{title}</h1>
            {subtitle && <p style={{color:MUTED,fontSize:13,margin:"6px 0 0"}}>{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}

// Field label — consistent across all forms. Renders as a real <label> so
// screen readers announce it; pass htmlFor + a matching input id to link them.
function FieldLabel({children, hint, htmlFor}) {
  return (
    <label htmlFor={htmlFor} style={{display:"block",color:TEXT,fontSize:12.5,textTransform:"uppercase",letterSpacing:1.2,fontWeight:700,margin:"0 0 8px"}}>
      {children}{hint && <span style={{color:MUTED,fontWeight:400,textTransform:"none",letterSpacing:0}}> — {hint}</span>}
    </label>
  );
}

function DateInput({value, onChange, min, id, invalid}) {
  return (
    <div style={{position:"relative"}}>
      <input id={id} type="date" value={value} onChange={onChange} min={min} style={{...inputStyle, paddingRight:40, ...(invalid?{borderColor:DANGER}:{})}}/>
      <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
        </svg>
      </div>
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;}`}</style>
    </div>
  );
}

// Segmented button group — replaces dropdowns where options are few
function SegGroup({options, value, onChange, cols}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols||options.length},1fr)`,gap:8}}>
      {options.map(o=>{
        const v = o.v!==undefined ? o.v : o;
        const l = o.l!==undefined ? o.l : o;
        const sel = value===v;
        return (
          <button key={v} onClick={()=>onChange(v)} style={{
            background: sel?ACCENT:CARD, color: sel?"#07090F":MUTED,
            border: sel?"none":`1px solid ${BORDER}`, borderRadius:10,
            padding:"11px 4px", fontSize:13, fontWeight: sel?800:500,
            cursor:"pointer", transition:"all 0.15s"
          }}>{l}</button>
        );
      })}
    </div>
  );
}



// Searchable duty picker — replaces a plain <select> with 90+ options.
// Collapsed by default (shows the current pick as one row) so long zone
// lists (e.g. Zone 1's 20+ duties) don't push the rest of the screen
// (Spare / CPC-Training) down — tap the row to expand and search.
function DutyPicker({duties, value, onChange}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const q = query.trim().toLowerCase();
  const filtered = q ? duties.filter(d => d.r.toLowerCase().includes(q)) : duties;
  const selected = value >= 0 ? duties[value] : null;

  if (!open) {
    return (
      <button type="button" onClick={()=>{setOpen(true); setTimeout(()=>inputRef.current?.focus(),0);}} style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,
        width:"100%",textAlign:"left",padding:"12px 14px",
        background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,cursor:"pointer"
      }}>
        <span style={{fontSize:14,fontWeight:selected?700:500,color:selected?TEXT:MUTED}}>
          {selected ? dutyLabel(selected) : `Tap to choose a duty (${duties.length})`}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    );
  }

  return (
    <div>
      <input ref={inputRef} type="text" inputMode="search" value={query} onChange={e=>setQuery(e.target.value)}
        placeholder="Type a duty number to search…"
        onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);setQuery("");}}}
        style={{...inputStyle, marginBottom:8}}/>
      <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${BORDER}`,borderRadius:10,background:CARD}}>
        {filtered.length===0 ? (
          <p style={{color:MUTED,fontSize:13,textAlign:"center",padding:"18px 12px",margin:0}}>No duties match "{query}"</p>
        ) : filtered.map(d=>{
          const i = duties.indexOf(d);
          const sel = i===value;
          return (
            <button key={d.r} onClick={()=>{onChange(i); setQuery(""); setOpen(false);}} style={{
              display:"block",width:"100%",textAlign:"left",padding:"12px 14px",
              background:sel?`${ACCENT}18`:"transparent",border:"none",
              borderBottom:`1px solid ${BORDER}`,
              color:sel?ACCENT:TEXT,fontSize:14,fontWeight:sel?700:500,cursor:"pointer"
            }}>{dutyLabel(d)}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
function buildPDFHTML(period, stats) {
  const endDate = addDays(period.startDate, 34);
  const generated = new Date().toLocaleDateString("en-IE",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
  const totalOK = stats.total <= MAX_HOURS;
  const sundayOK = stats.sunday <= MAX_SUNDAY;
  const totalPct = Math.min((stats.total / MAX_HOURS) * 100, 100).toFixed(1);
  const sundayPct = Math.min((stats.sunday / MAX_SUNDAY) * 100, 100).toFixed(1);
  const totalColor = totalOK ? (stats.total / MAX_HOURS >= 0.8 ? "#f59e0b" : "#16a34a") : "#dc2626";
  const sundayColor = sundayOK ? (stats.sunday / MAX_SUNDAY >= 0.8 ? "#f59e0b" : "#16a34a") : "#dc2626";

  let weeksHTML = "";
  stats.weeks.forEach((w, i) => {
    const allItems = [
      ...w.shifts.map(s => ({...s, _type:"shift"})),
      ...(w.daysOff||[]).map(d => ({...d, _type:"dayoff"}))
    ].sort((a,b) => a.date.localeCompare(b.date));
    const cards = allItems.map(item => {
      if (item._type === "shift") {
        const spread = fmtHrs(calcSpreadover(item.reportTime, item.signOffTime));
        const tags = [
          item.isSpare ? '<span style="background:#fbbf24;color:#000;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px">SPARE</span>' : "",
          item.isRestDay ? '<span style="background:#dc2626;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;margin-right:4px">REST DAY</span>' : ""
        ].join("");
        const stat = (label,value,color) => `<div><span style="display:block;color:#9ca3af;font-size:9px;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:1px">${label}</span><span style="font-size:12px;font-weight:600;color:${color||"#111"}">${value}</span></div>`;
        const stats5 = [
          stat("Report", item.reportTime || "—"),
          stat("Sign Off", item.signOffTime || "—"),
          stat("Spreadover", spread, item.isRestDay?"#dc2626":null),
          stat("Work", item.isRestDay||item.isSpare?"—":fmtHrs(item.workHours)),
          stat("Relief", item.isRestDay||item.isSpare?"—":fmtHrs(item.reliefHours)),
        ].join("");
        const otLine = item.overtimeHours > 0
          ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6;font-size:11px"><span style="color:#d97706;font-weight:700">Overtime: ${fmtHrs(item.overtimeHours)}</span>${item.overtimeNote ? ` <span style="color:#6b7280;font-style:italic">— ${item.overtimeNote}</span>` : ""}</div>`
          : "";
        const notesLine = item.notes
          ? `<div style="margin-top:6px;font-size:11px;color:#6b7280;font-style:italic">${item.notes}</div>`
          : "";
        return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:6px;page-break-inside:avoid;break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;margin-bottom:8px">
            <div style="font-size:13px"><strong>${fmtDate(item.date)}</strong> <span style="color:#6b7280">· ${item.zone}</span></div>
            <div style="font-size:12px;font-weight:700;color:#1e3a5f">${tags}${item.roster}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${stats5}</div>
          ${otLine}${notesLine}
        </div>`;
      }
      return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;margin-bottom:6px;background:#f9fafb;page-break-inside:avoid;break-inside:avoid;display:flex;justify-content:space-between;align-items:baseline">
        <strong style="font-size:13px">${fmtDate(item.date)}</strong>
        <span style="font-size:12px;font-style:italic;color:#6b7280">${item.type}</span>
      </div>`;
    }).join("");
    weeksHTML += `
      <div style="page-break-inside:avoid;break-inside:avoid">
        <h3 style="background:#1e3a5f;color:white;padding:8px 12px;margin:16px 0 8px;border-radius:6px;font-size:14px">
          Week ${i+1}: ${fmtShort(w.start)} – ${fmtShort(w.end)} &nbsp;|&nbsp; ${fmtHrs(w.total)} total${w.sunday>0?` / ${fmtHrs(w.sunday)} Sun`:""}${w.overtime>0?` / ${fmtHrs(w.overtime)} OT`:""}
        </h3>
        ${cards || '<p style="color:#6b7280;text-align:center;padding:10px 0">No entries this week</p>'}
      </div>`;
  });

  const tallyRows = DAY_OFF_TYPES.map(t =>
    `<tr><td style="padding:6px 8px">${t}</td><td style="padding:6px 8px;font-weight:bold">${stats.tally[t] || 0}</td></tr>`
  ).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Dublin Bus Shift Record — ${fmtShort(period.startDate)} to ${fmtShort(endDate)}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#111}
  h1{color:#1e3a5f;margin:0 0 4px}
  h2{color:#1e3a5f;border-bottom:2px solid #fbbf24;padding-bottom:6px;margin:24px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td,th{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left;word-wrap:break-word;overflow-wrap:break-word}
  th{background:#f9fafb;font-weight:600}
  .comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}
  .comp-box{border:2px solid;border-radius:8px;padding:14px}
  .bar-bg{background:#e5e7eb;border-radius:4px;height:8px;margin:8px 0}
  .bar-fill{height:8px;border-radius:4px}
  tr{page-break-inside:avoid;break-inside:avoid}
  @page{size:A4;margin:15mm}
  @media print{body{padding:0;max-width:none}}
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
  <div>
    <h1>Dublin Bus — Shift Record</h1>
    <p style="margin:4px 0;color:#6b7280">Period: <strong>${fmtLong(period.startDate)}</strong> to <strong>${fmtLong(endDate)}</strong></p>
    <p style="margin:4px 0;color:#6b7280">Generated: ${generated}</p>
  </div>
</div>

<h2>Compliance Summary</h2>
<div class="comp-grid">
  <div class="comp-box" style="border-color:${totalColor}">
    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Total Hours</div>
    <div style="font-size:28px;font-weight:800;color:${totalColor}">${fmtHrs(stats.total)}</div>
    <div class="bar-bg"><div class="bar-fill" style="width:${totalPct}%;background:${totalColor}"></div></div>
    <div style="font-size:12px;color:#6b7280">${totalPct}% of limit (190h 4m)</div>
    <div style="margin-top:8px;font-weight:700;color:${totalColor}">${totalOK ? "✓ Within limit" : "⚠ LIMIT EXCEEDED"}</div>
  </div>
  <div class="comp-box" style="border-color:${sundayColor}">
    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Sunday Hours</div>
    <div style="font-size:28px;font-weight:800;color:${sundayColor}">${fmtHrs(stats.sunday)}</div>
    <div class="bar-bg"><div class="bar-fill" style="width:${sundayPct}%;background:${sundayColor}"></div></div>
    <div style="font-size:12px;color:#6b7280">${sundayPct}% of limit (14h 30m)</div>
    <div style="margin-top:8px;font-weight:700;color:${sundayColor}">${sundayOK ? "✓ Within limit" : "⚠ LIMIT EXCEEDED"}</div>
  </div>
</div>
${stats.overtime > 0 ? `
<div class="comp-box" style="border-color:#d97706;margin-bottom:8px">
  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Overtime Hours (not counted toward limit)</div>
  <div style="font-size:28px;font-weight:800;color:#d97706">${fmtHrs(stats.overtime)}</div>
  <div style="font-size:12px;color:#6b7280;margin-top:4px">Includes rest day working and any logged overtime hours</div>
</div>` : ""}
<div style="background:#f3f4f6;border-radius:8px;padding:12px;margin-bottom:8px">
  <strong>Max consecutive days worked:</strong> ${stats.consec} day${stats.consec !== 1 ? "s" : ""}
</div>

<h2>Non-Working Days</h2>
<table><thead><tr><th>Type</th><th>Days</th></tr></thead>
<tbody>${tallyRows}</tbody></table>

<h2>Week by Week Breakdown</h2>
${weeksHTML}

<div style="margin-top:24px;padding:12px;background:#f3f4f6;border-radius:8px;font-size:12px;color:#6b7280">
  This document was generated by Dublin Bus Shift Tracker. For use in discussions with management or union representation.
</div>
</body></html>`;
}

function exportPDF(period, stats) {
  const html = buildPDFHTML(period, stats);
  const blob = new Blob([html], {type: "text/html"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.target = "_blank";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ─── COMPLIANCE BAR ──────────────────────────────────────────────────────────
function ComplianceBar({label, current, max, limitLabel}) {
  const pct = Math.min((current / max) * 100, 100);
  const color = compColor(current, max);
  const over = current > max;
  return (
    <div style={{...cardStyle, padding:"12px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{color:MUTED,fontSize:12,textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
        <span style={{color,fontWeight:700,fontSize:15}}>{fmtHrs(current)} <span style={{color:MUTED,fontWeight:400,fontSize:12}}>/ {limitLabel}</span></span>
      </div>
      <div style={{background:BORDER,borderRadius:4,height:7}}>
        <div style={{width:"100%",transform:`scaleX(${pct/100})`,transformOrigin:"left",background:color,height:7,borderRadius:4,transition:"transform 0.3s"}} />
      </div>
      {over && <p style={{color:DANGER,fontSize:12,margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
    </div>
  );
}

// ─── BACKUP NUDGE BANNER ────────────────────────────────────────────────────────
// Shown on Home when there's real data on the device and no recent export —
// a lost phone or a cleared cache today means a lost shift history, and the
// only way off this device is a backup the driver has to remember to make.
function BackupNudgeBanner({onDismiss}) {
  const [busy, setBusy] = useState(false);
  const daysSince = daysSinceLastBackup();
  const message = daysSince === null
    ? "You've never backed up your data. A lost phone or cleared cache would lose your shift history."
    : `Last backup: ${daysSince} day${daysSince===1?"":"s"} ago. Worth a fresh one.`;
  return (
    <div style={{...cardStyle,marginBottom:12,padding:"14px 16px",border:`1px solid ${ACCENT}44`,display:"flex",gap:12,alignItems:"flex-start"}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${ACCENT}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4.5 4.5 0 0 1-1-8.9 5 5 0 0 1 9.7-1.7A4 4 0 0 1 17 15.9"/><polyline points="12 12 12 21"/><polyline points="9 18 12 21 15 18"/></svg>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{color:TEXT,fontSize:13.5,fontWeight:700,margin:"0 0 3px"}}>Back up your data</p>
        <p style={{color:MUTED,fontSize:12.5,margin:"0 0 10px"}}>{message}</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            setBusy(true);
            const res = runExportBackup();
            setBusy(false);
            if(res.ok) onDismiss();
          }} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:9,padding:"9px 14px",fontSize:12.5,fontWeight:800,cursor:"pointer"}}>
            {busy?"Backing up…":"Back up now"}
          </button>
          <button onClick={()=>{ snoozeBackupNudge(7); onDismiss(); }} style={{background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:9,padding:"9px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}

const APP_VERSION = "1.6";
const WHATS_NEW = {
  version: "1.6",
  title: "What's new in v1.6",
  showToExisting: true,
  features: [
    { icon: "carousel", heading: "Upcoming days on Home", body: "A new strip at the top of Home shows your next few days at a glance — swipe to see more, tap any day to log it straight away." },
    { icon: "repeat", heading: "Repeat a duty while logging", body: "Log a Shift now lets you tick off extra days in the same week when you're logging the same duty — no more separate Repeat screen." },
    { icon: "overwrite", heading: "Fix a mistake without being blocked", body: "Logging a shift on a date that already has one no longer hard-blocks you — you can now confirm to overwrite it." },
    { icon: "board", heading: "Running board corrections", body: "Corrected report/depart times and stops across a large number of duties — running boards should now match your real routes more closely." },
    { icon: "period", heading: "Period screen opens on your week", body: "Opening the Period tab now takes you straight to your current week — the other four stay collapsed until you tap them." },
    { icon: "install", heading: "Install to your home screen", body: "Add the app to your home screen like a real app, and it'll still open with no signal (garage, underground stop, etc)." },
    { icon: "backup", heading: "Backup reminder", body: "If it's been a while since you last backed up your data, Home will now nudge you — protects against losing everything if you clear your cache or change phones." },
  ]
};

// SVG icon set for What's New — replaces raw emoji, which can render as blank
// boxes on older/budget Android devices.
function WhatsNewIcon({type}) {
  const wrap = {width:38,height:38,borderRadius:10,background:`${ACCENT}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1};
  const s = {width:19,height:19,fill:"none",stroke:ACCENT,strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};
  if(type==="theme") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 0 1-7.54-7.54A9 9 0 0 0 12 3z"/></svg></div>;
  if(type==="dayoff") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="12" y1="13" x2="12" y2="18"/><line x1="9.5" y1="15.5" x2="14.5" y2="15.5"/></svg></div>;
  if(type==="daterange") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="13" x2="10" y2="13"/><line x1="14" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg></div>;
  if(type==="anydate") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg></div>;
  if(type==="backup") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M7 18a4.5 4.5 0 0 1-1-8.9 5 5 0 0 1 9.7-1.7A4 4 0 0 1 17 15.9"/><polyline points="12 12 12 21"/><polyline points="9 18 12 21 15 18"/></svg></div>;
  if(type==="datepicker") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><circle cx="12" cy="14" r="2.5"/></svg></div>;
  if(type==="carousel") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="2" y="5" width="7" height="14" rx="1.5"/><rect x="14.5" y="5" width="7" height="14" rx="1.5" opacity="0.4"/></svg></div>;
  if(type==="repeat") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></div>;
  if(type==="overwrite") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M20 6L9 17l-5-5"/></svg></div>;
  if(type==="board") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></div>;
  if(type==="period") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><rect x="6.5" y="12" width="4.5" height="4.5" rx="0.5" fill={ACCENT} stroke="none"/></svg></div>;
  if(type==="install") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg></div>;
  return null;
}

// ─── WHAT'S NEW SCREEN ────────────────────────────────────────────────────────
function WhatsNewScreen({onDone, onSkipTour}) {
  return (
    <div style={{background:BG,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"32px 20px 16px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <p style={{color:ACCENT,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 6px"}}>Just updated</p>
        <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"}}>{WHATS_NEW.title}</h1>
        <p style={{color:MUTED,fontSize:13,margin:0}}>Here's what's changed since your last version</p>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"8px 16px 16px"}}>
        {WHATS_NEW.features.map((f,i)=>(
          <div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",gap:14,alignItems:"flex-start"}}>
            <WhatsNewIcon type={f.icon}/>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 4px"}}>{f.heading}</p>
              <p style={{color:MUTED,fontSize:13,margin:0,lineHeight:1.5}}>{f.body}</p>
            </div>
          </div>
        ))}
        <button onClick={onDone} style={{...btnStyle,marginTop:8}}>
          Got it — let's go
        </button>
        {onSkipTour && (
          <button onClick={onSkipTour} style={{background:"none",border:"none",color:MUTED,fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",padding:"14px 0 0"}}>
            Skip the tour — I know the app
          </button>
        )}
      </div>
    </div>
  );
}


function TermsScreen({onAccept, readOnly, onClose}) {
  const [tick1, setTick1] = useState(false);
  const [tick2, setTick2] = useState(false);
  const [hasScrolledEnd, setHasScrolledEnd] = useState(readOnly);
  const canAccept = tick1 && tick2;

  function checkScrollEnd(e) {
    if(hasScrolledEnd) return;
    const el = e.target;
    if(el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setHasScrolledEnd(true);
  }

  return (
    <div style={{background:BG,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"32px 20px 16px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <p style={{color:ACCENT,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 6px"}}>{readOnly?"Reference":"Before you begin"}</p>
        <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"}}>Terms & Conditions</h1>
        <p style={{color:MUTED,fontSize:13,margin:0}}>{readOnly?"For your reference":"Please read carefully before using Dublin Bus Shift Tracker"}</p>
      </div>

      <div onScroll={checkScrollEnd} style={{flex:1,overflowY:"auto",padding:"0 16px 16px"}}>
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"18px 16px",marginBottom:16,fontSize:14,lineHeight:1.7,color:TEXT}}>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>1. Ownership &amp; Intellectual Property</p>
          <p style={{margin:"0 0 14px"}}>Dublin Bus Shift Tracker and all content within it, including running board data, interface design, and code, is the private property of the developer. All rights are reserved. The app may not be copied, redistributed, or reproduced in any form without the express written permission of the developer.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>2. Private Use Only</p>
          <p style={{margin:"0 0 14px"}}>This app is provided for the personal, private use of authorised users only. It is not affiliated with, endorsed by, or connected to Dublin Bus, Dublin Bus management, or any trade union. Any resemblance to official Dublin Bus systems is incidental.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>3. Data Accuracy &amp; Responsibility</p>
          <p style={{margin:"0 0 14px"}}>The accuracy of hours, compliance figures, and shift records displayed in this app is entirely dependent on the data entered by the user. The developer accepts no responsibility for errors arising from incorrect data entry. In any employment dispute or compliance matter, official records held by Dublin Bus take precedence over figures shown in this app.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>4. Running Board Data</p>
          <p style={{margin:"0 0 14px"}}>Running board and schedule information displayed in the app is sourced from Dublin Bus operational data. This data may not always reflect last-minute operational changes, diversions, or schedule amendments. Users should always verify current duties through official Dublin Bus channels. The developer will endeavour to keep data up to date but cannot guarantee real-time accuracy.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>5. Data Storage &amp; Privacy</p>
          <p style={{margin:"0 0 14px"}}>All data entered into the app is stored locally on your device only. The developer has no access to your personal data, shift records, or usage information at any time.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>6. Limitation of Liability</p>
          <p style={{margin:"0 0 14px"}}>The developer accepts no liability for any loss, consequence, or outcome arising from the use of or reliance on information displayed in this app, including but not limited to hours calculations, compliance figures, or running board data.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>7. Availability &amp; Access</p>
          <p style={{margin:"0 0 14px"}}>The app may be updated, modified, or taken offline at any time and without prior notice. Access may be revoked at the developer's sole discretion. Features may be added or removed without notice.</p>

          <p style={{color:TEXT,fontWeight:700,fontSize:15,margin:"0 0 8px"}}>8. Safe Use</p>
          <p style={{margin:"0 0 0"}}>This app must never be used while driving, operating a vehicle, or in any situation where use of a mobile device is prohibited by law or company policy. The developer accepts no liability for any incident arising from unsafe use of the app.</p>
        </div>

        {readOnly ? (
          <button onClick={onClose} style={{...btnStyle,marginBottom:32}}>Close</button>
        ) : (<>

        {!hasScrolledEnd && (
          <p style={{color:ACCENT,fontSize:12,textAlign:"center",margin:"0 0 10px",fontWeight:600}}>Scroll to the bottom to continue ↓</p>
        )}

        {/* Checkbox 1 */}
        <div onClick={()=>hasScrolledEnd&&setTick1(!tick1)} style={{background:CARD,border:`1px solid ${tick1?ACCENT:BORDER}`,borderRadius:14,padding:"16px",marginBottom:10,cursor:hasScrolledEnd?"pointer":"not-allowed",opacity:hasScrolledEnd?1:0.5,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${tick1?ACCENT:BORDER}`,background:tick1?ACCENT:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
            {tick1&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#07090F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <p style={{color:tick1?TEXT:MUTED,fontSize:13,fontWeight:tick1?600:400,margin:0,lineHeight:1.5}}>I have read and agree to the Terms &amp; Conditions above</p>
        </div>

        {/* Checkbox 2 */}
        <div onClick={()=>hasScrolledEnd&&setTick2(!tick2)} style={{background:CARD,border:`1px solid ${tick2?ACCENT:BORDER}`,borderRadius:14,padding:"16px",marginBottom:20,cursor:hasScrolledEnd?"pointer":"not-allowed",opacity:hasScrolledEnd?1:0.5,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${tick2?ACCENT:BORDER}`,background:tick2?ACCENT:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
            {tick2&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#07090F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <p style={{color:tick2?TEXT:MUTED,fontSize:13,fontWeight:tick2?600:400,margin:0,lineHeight:1.5}}>I confirm I will not use this app while driving or operating a vehicle</p>
        </div>

        <button onClick={onAccept} disabled={!canAccept} style={{...btnStyle,opacity:canAccept?1:0.35,marginBottom:32}}>
          Accept &amp; Continue
        </button>
        </>)}
      </div>
    </div>
  );
}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
function SetupScreen({onCreate}) {
  const [date, setDate] = useState(thisSunday());
  const isSun = getDayType(date) === "sunday";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:`radial-gradient(circle at 50% 0%,${CARD2} 0%,${BG} 60%)`,padding:24}}>
      <div style={{marginBottom:20}}><BusLogo size={64}/></div>
      <p style={{color:MUTED,fontSize:11,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:3,fontWeight:600}}>Dublin Bus</p>
      <h1 style={{color:TEXT,fontSize:28,fontWeight:800,textAlign:"center",margin:"0 0 12px",letterSpacing:"-0.5px"}}>Shift Tracker</h1>
      <p style={{color:MUTED,textAlign:"center",marginBottom:36,fontSize:15,maxWidth:300,lineHeight:1.5}}>
        Track your hours and look up any duty. To start, pick the <strong style={{color:ACCENT}}>Sunday</strong> your 5-week period begins.
      </p>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{...cardStyle,marginBottom:14}}>
          <FieldLabel>Period start date</FieldLabel>
          <DateInput value={date} onChange={e => setDate(e.target.value)}/>
          {!isSun && (
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 0"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0}}/>
              <p style={{color:DANGER,fontSize:13,margin:0}}>That's not a Sunday — periods must start on a Sunday</p>
            </div>
          )}
          {isSun && date && (
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 0"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:SUCCESS,flexShrink:0}}/>
              <p style={{color:SUCCESS,fontSize:13,margin:0}}>{fmtShort(date)} – {fmtShort(addDays(date,34))} · 5 weeks</p>
            </div>
          )}
        </div>
        <button style={{...btnStyle,opacity:isSun?1:0.4}} disabled={!isSun} onClick={() => isSun && onCreate(date)}>
          Start Period →
        </button>
      </div>
    </div>
  );
}

// ─── TODAY DUTY CARD ──────────────────────────────────────────────────────────
function TodayDutyCard({shift, label, accentColor, defaultExpanded=true}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const seq = useMemo(()=>getSeq(shift.zone, getDayType(shift.date), shift.duty||shift.roster),[shift]);
  const duty = DUTIES.find(d=>d.r===shift.roster&&d.t===getDayType(shift.date)&&d.z===shift.zone);
  const spread = calcSpreadover(shift.reportTime, shift.signOffTime);
  const ac = accentColor;

  function entryStyle(entry) {
    const low = entry.toLowerCase();
    if (low.includes('report')) return {dot:ac, label:"REPORT", color:ac};
    if (low.includes('finish')) return {dot:SUCCESS, label:"FINISH", color:SUCCESS};
    if (low.includes('break') && !low.includes('return')) return {dot:"#F59E0B", label:"BREAK", color:"#F59E0B"};
    const rm = entry.match(/\((\w+)\)/);
    const route = rm ? rm[1] : null;
    const isRoute = route && /^\d/.test(route);
    return {dot:"#60a5fa", label:isRoute?route:null, color:TEXT, isRoute};
  }

  return (
    <div style={{background:`linear-gradient(135deg,${CARD2} 0%,#0D1B2A 100%)`,border:`1px solid ${ac}44`,borderRadius:18,marginBottom:12,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <p style={{color:ac,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 4px"}}>{label}</p>
            <p style={{color:TEXT,fontSize:28,fontWeight:800,margin:0,letterSpacing:"-1px"}}>{shift.roster}</p>
            <p style={{color:MUTED,fontSize:13,margin:"3px 0 0"}}>{shift.zone}{shift.isSpare?" · Spare":""}{shift.isRestDay?" · Rest day":""}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:TEXT,fontSize:20,fontWeight:800,margin:0}}>{fmtHrs(spread)}</p>
            {getDayType(shift.date)==="sunday"&&<span style={{...tag(SUCCESS),marginTop:4,display:"block"}}>Sunday</span>}
            <span style={{color:ac,fontSize:12,marginTop:6,display:"block"}}>{expanded?"▲ less":"▼ running board"}</span>
          </div>
        </div>
        {/* Key times row */}
        <div style={{display:"grid",gridTemplateColumns:`1fr ${duty?.b?"1fr ":""}1fr`,gap:6}}>
          <div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px"}}>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Report</p>
            <p style={{color:ac,fontSize:15,fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{shift.reportTime}</p>
          </div>
          {duty?.b&&<div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px"}}>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Break</p>
            <p style={{color:"#F59E0B",fontSize:15,fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{duty.bs||"–"}</p>
          </div>}
          <div style={{background:"#07090F55",borderRadius:10,padding:"8px 10px"}}>
            <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 2px"}}>Finish</p>
            <p style={{color:SUCCESS,fontSize:15,fontWeight:800,margin:0,fontVariantNumeric:"tabular-nums"}}>{shift.signOffTime}</p>
          </div>
        </div>
      </div>

      {/* Inline running board */}
      {expanded && seq.length > 0 && (
        <div style={{borderTop:`1px solid ${ac}22`,padding:"12px 18px 16px"}}>
          <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 12px"}}>Running Board</p>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:7,top:8,bottom:8,width:2,background:`${BORDER}`,borderRadius:1}}/>
            {seq.map((entry, i) => {
              const timeMatch = entry.match(/^(\d{1,2}:\d{2})/);
              const time = timeMatch ? timeMatch[1] : "";
              const rest = entry.replace(/^\d{1,2}:\d{2}\s*-\s*/, "").trim();
              const {dot, label:eLabel, color} = entryStyle(entry);
              return (
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:i<seq.length-1?10:0,position:"relative"}}>
                  <div style={{width:16,height:16,borderRadius:"50%",background:dot,flexShrink:0,marginTop:2,boxShadow:`0 0 6px ${dot}66`,zIndex:1}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{color:color,fontSize:16,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{time}</span>
                      {eLabel&&<span style={{background:`${dot}22`,color:dot,borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:700,letterSpacing:0.5}}>{eLabel}</span>}
                    </div>
                    <p style={{color:MUTED,fontSize:13,margin:"2px 0 0",lineHeight:1.3}}>{rest}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expanded && seq.length === 0 && (
        <div style={{borderTop:`1px solid ${ac}22`,padding:"12px 18px 16px"}}>
          <p style={{color:MUTED,fontSize:13,margin:0,textAlign:"center"}}>No running board available for this duty</p>
        </div>
      )}
    </div>
  );
}

// ─── UPCOMING CAROUSEL ──────────────────────────────────────────────────────
// Fixed 29-day window (7 back, today, 21 forward) in a native scroll-snap
// strip, defaulted scrolled so today is the first of 3 visible cards. No
// infinite loading — if a driver ever wants to swipe further than 3 weeks
// out, that's a follow-up, not needed for the initial ask.
const CAROUSEL_DAYS_BACK = 7;
const CAROUSEL_DAYS_FORWARD = 21;
const carouselArrowStyle = {background:CARD,border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0};

function UpcomingDayCard({date, isToday, info, onLogDate}) {
  const dayLabel = new Date(date+"T12:00:00").toLocaleDateString("en-IE", {weekday:"short"});
  const dateLabel = fmtShort(date);
  let body;
  if (info.status === "shift") {
    const departLocation = shiftDepartLocation(info.shift);
    body = (
      <>
        <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{info.shift.roster}</p>
        <p style={{color:MUTED,fontSize:11,margin:0}}>{info.shift.reportTime}–{info.shift.signOffTime}</p>
        {departLocation && <p style={{color:MUTED,fontSize:11,margin:"1px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{departLocation}</p>}
      </>
    );
  } else if (info.status === "dayoff") {
    const isRest = info.dayOff.type === "Rest Day";
    body = <p style={{color:isRest?DANGER:ACCENT,fontSize:12,fontWeight:700,margin:0}}>{info.dayOff.type}</p>;
  } else {
    body = <p style={{color:MUTED,fontSize:12,margin:0}}>Not logged</p>;
  }
  const isRestDayCard = info.status === "dayoff" && info.dayOff.type === "Rest Day";
  const clickable = info.status === "unlogged" || isRestDayCard;
  return (
    <div
      onClick={clickable ? () => onLogDate(date, isRestDayCard ? {isRestDay:true} : undefined) : undefined}
      style={{
        background:CARD, border:`1px solid ${isToday?ACCENT:BORDER}`, borderRadius:14,
        padding:"10px 10px", flex:"0 0 calc(33.333% - 6px)",
        scrollSnapAlign:"start", cursor:clickable?"pointer":"default", position:"relative"
      }}>
      <p style={{color:isToday?ACCENT:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,margin:"0 0 2px",paddingRight:clickable?20:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dayLabel} {dateLabel}</p>
      {body}
      {clickable && (
        <div aria-hidden="true" style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:ACCENT,color:"#07090F",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</div>
      )}
    </div>
  );
}

function UpcomingCarousel({periods, activePeriodId, todayDate, onLogDate}) {
  const containerRef = useRef(null);
  const dates = useMemo(() => {
    const arr = [];
    for (let i = -CAROUSEL_DAYS_BACK; i <= CAROUSEL_DAYS_FORWARD; i++) arr.push(addDays(todayDate, i));
    return arr;
  }, [todayDate]);
  const todayIndex = CAROUSEL_DAYS_BACK;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !el.children[todayIndex]) return;
    el.scrollLeft = el.children[todayIndex].offsetLeft;
  }, [todayIndex]);

  function scrollByCard(dir) {
    const el = containerRef.current;
    if (!el || !el.children[0]) return;
    const cardEl = el.children[0];
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || "0");
    el.scrollBy({ left: dir * (cardEl.offsetWidth + gap), behavior: "smooth" });
  }

  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button aria-label="Earlier days" onClick={()=>scrollByCard(-1)} style={carouselArrowStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div ref={containerRef} className="upcoming-carousel-track" style={{display:"flex",gap:8,overflowX:"auto",scrollSnapType:"x mandatory",flex:1}}>
          {dates.map((date, i) => (
            <UpcomingDayCard key={date} date={date} isToday={i===todayIndex} info={dayInfo(periodForDate(periods, date, activePeriodId), date)} onLogDate={onLogDate}/>
          ))}
        </div>
        <button aria-label="Later days" onClick={()=>scrollByCard(1)} style={carouselArrowStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <style>{`.upcoming-carousel-track{-webkit-overflow-scrolling:touch;scrollbar-width:none}.upcoming-carousel-track::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({period, periods, onLog, onLogDate, onGoWeek, onHelp, onThemeChange, leaveSettings, onLeaveSettingsChange, onViewTerms}) {
  const stats = useMemo(() => pStats(period), [period]);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmFeedback, setConfirmFeedback] = useState(false);
  const [backupBannerDismissed, setBackupBannerDismissed] = useState(false);
  const todayDate = today();
  const cwIdx = stats.weeks.findIndex(w => todayDate >= w.start && todayDate <= w.end);
  const wi = cwIdx >= 0 ? cwIdx : 0;
  const cw = stats.weeks[wi];
  const totalPct = Math.min((stats.total/MAX_HOURS)*100,100);
  const sunPct = Math.min((stats.sunday/MAX_SUNDAY)*100,100);
  const remainingHrs = Math.max(0, MAX_HOURS - stats.total);

  // Today's duty — look for a shift logged for today
  const todayShift = (period.shifts||[]).find(s => s.date === todayDate);
  // Tomorrow's duty — look for a shift logged for tomorrow
  const tomorrowShift = (period.shifts||[]).find(s => s.date === addDays(todayDate,1));
  // Fixed rest day — comes from the merged (real + auto) daysOff on the current week
  const todayRestEntry = (cw.daysOff||[]).find(d => d.date === todayDate && d.type === "Rest Day");

  const hasRealData = (period.shifts?.length||0) > 0 || (period.daysOff?.length||0) > 0;
  const showBackupNudge = !backupBannerDismissed && hasRealData && !isBackupNudgeSnoozed()
    && (daysSinceLastBackup() === null || daysSinceLastBackup() >= 14);

  useEffect(() => {
    if (!loadSettings().notificationsEnabled) return;
    if (!todayShift && !todayRestEntry) {
      notifyOnce(`dbus_notified_log_${todayDate}`, "Log today's shift", "Nothing logged yet for today in Shift Tracker.");
    }
    if (stats.total >= MAX_HOURS*0.9) {
      notifyOnce(`dbus_notified_total90_${period.id}`, "Approaching your period limit", `You're at ${fmtHrs(stats.total)} of your 190h 4m limit.`);
    }
    if (stats.sunday >= MAX_SUNDAY*0.9) {
      notifyOnce(`dbus_notified_sun90_${period.id}`, "Approaching your Sunday hours limit", `You're at ${fmtHrs(stats.sunday)} of your 14h 30m Sunday limit.`);
    }
  }, [period.id, stats.total, stats.sunday, todayShift, todayRestEntry, todayDate]);

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)} onThemeChange={onThemeChange} leaveSettings={leaveSettings} onLeaveSettingsChange={onLeaveSettingsChange} onReplayTour={()=>{setShowSettings(false);onHelp();}} onViewTerms={()=>{setShowSettings(false);onViewTerms();}}/>}
      {confirmFeedback && <ConfirmDialog msg="This opens a feedback form in a new tab, outside the app. Continue?" yesLabel="Continue" onYes={()=>{setConfirmFeedback(false);window.open("https://docs.google.com/forms/d/e/1FAIpQLScgZEIoRM7xqkOpSyVcDQl23fbDJ_UTq99sF0c4mgta5bwrUQ/viewform?usp=header","_blank");}} onNo={()=>setConfirmFeedback(false)}/>}

      {/* Header gradient */}
      <div style={{padding:"28px 20px 20px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>Shift Tracker</p>
            <p style={{color:TEXT,fontSize:22,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>
              {fmtShort(period.startDate)} <span style={{color:MUTED,fontWeight:400}}>—</span> {fmtShort(addDays(period.startDate,34))}
            </p>
            <p style={{color:MUTED,fontSize:12,margin:"4px 0 0"}}>Week {wi+1} of 5 · {fmtShort(cw.start)} – {fmtShort(cw.end)}</p>
          </div>
        <div style={{display:"flex",gap:10}}>
          <button aria-label="Send feedback" onClick={()=>setConfirmFeedback(true)} style={{background:CARD,border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,width:44,height:44,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button aria-label="Settings" onClick={()=>setShowSettings(true)} style={{background:CARD,border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,width:44,height:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button aria-label="Help / tour" onClick={onHelp} style={{background:CARD,border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,width:44,height:44,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}>?</button>
        </div>
        </div>
      </div>

      <div style={{padding:"0 16px"}}>

        <UpcomingCarousel periods={periods} activePeriodId={period.id} todayDate={todayDate} onLogDate={onLogDate}/>

        {showBackupNudge && <BackupNudgeBanner onDismiss={()=>setBackupBannerDismissed(true)} />}

        {/* TODAY'S DUTY — hero card when a shift is logged for today */}
        {todayShift ? (
          <TodayDutyCard shift={todayShift} label="Today's Duty" accentColor={ACCENT} />
        ) : todayRestEntry ? (
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${SUCCESS}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>
            </div>
            <div style={{flex:1}}>
              <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 2px"}}>Resting today</p>
              <p style={{color:MUTED,fontSize:12,margin:0}}>Scheduled rest day — nothing to log</p>
            </div>
          </div>
        ) : (
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"16px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${ACCENT}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style={{flex:1}}>
              <p style={{color:TEXT,fontSize:14,fontWeight:700,margin:"0 0 2px"}}>No duty logged for today</p>
              <p style={{color:MUTED,fontSize:12,margin:0}}>Log today's shift or look up your duty below</p>
            </div>
          </div>
        )}

        {tomorrowShift && (
          <TodayDutyCard shift={tomorrowShift} label="Tomorrow's Duty" accentColor="#60a5fa" defaultExpanded={false} />
        )}

        {/* Quick action */}
        <button style={{...btnStyle,fontSize:16,padding:"16px 20px",borderRadius:14,textAlign:"left",marginBottom:12}} onClick={onLog}>
          + Log a Shift
        </button>

        {/* Remaining hours + week totals */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px"}}>
            <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 4px"}}>Remaining</p>
            <p style={{color:remainingHrs<20?DANGER:remainingHrs<40?"#F59E0B":TEXT,fontSize:22,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{fmtHrs(remainingHrs)}</p>
            <p style={{color:MUTED,fontSize:11,margin:"2px 0 0"}}>of 190h 4m</p>
          </div>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 16px"}}>
            <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 4px"}}>This week</p>
            <p style={{color:TEXT,fontSize:22,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>{fmtHrs(cw.total)}</p>
            {cw.sunday>0&&<p style={{color:SUCCESS,fontSize:11,margin:"2px 0 0"}}>Sun {fmtHrs(cw.sunday)}</p>}
          </div>
        </div>

        {/* 5-week grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12}}>
          {stats.weeks.map((w,i)=>(
            <div key={i} onClick={()=>onGoWeek(i)} style={{
              background:i===wi?`${ACCENT}18`:CARD,
              border:`1px solid ${i===wi?ACCENT:BORDER}`,
              borderRadius:12, padding:"10px 4px", textAlign:"center", cursor:"pointer"
            }}>
              <p style={{color:i===wi?ACCENT:MUTED,fontSize:11,margin:"0 0 4px",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>W{i+1}</p>
              <p style={{color:w.total>0?TEXT:MUTED,fontWeight:700,fontSize:14,margin:0}}>{w.total>0?fmtHrs(w.total):"–"}</p>
              {w.sunday>0&&<p style={{color:SUCCESS,fontSize:10.5,margin:"2px 0 0"}}>{fmtHrs(w.sunday)}</p>}
            </div>
          ))}
        </div>

        {/* Period compliance */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 18px"}}>
          <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 14px"}}>Period limits</p>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:MUTED,fontSize:13}}>Total hours</span>
              <span style={{color:stats.total>MAX_HOURS?DANGER:ACCENT,fontWeight:700,fontSize:13}}>{fmtHrs(stats.total)} <span style={{color:MUTED,fontWeight:400,fontSize:11}}>/ 190h 4m</span></span>
            </div>
            <div style={{background:BORDER,borderRadius:4,height:5}}>
              <div style={{width:"100%",transform:`scaleX(${totalPct/100})`,transformOrigin:"left",background:stats.total>MAX_HOURS?DANGER:totalPct>80?"#F59E0B":SUCCESS,height:5,borderRadius:4,transition:"transform 0.4s"}}/>
            </div>
            {stats.total>MAX_HOURS && <p style={{color:DANGER,fontSize:11,margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:MUTED,fontSize:13}}>Sunday hours</span>
              <span style={{color:stats.sunday>MAX_SUNDAY?DANGER:SUCCESS,fontWeight:700,fontSize:13}}>{fmtHrs(stats.sunday)} <span style={{color:MUTED,fontWeight:400,fontSize:11}}>/ 14h 30m</span></span>
            </div>
            <div style={{background:BORDER,borderRadius:4,height:5}}>
              <div style={{width:"100%",transform:`scaleX(${sunPct/100})`,transformOrigin:"left",background:stats.sunday>MAX_SUNDAY?DANGER:sunPct>80?"#F59E0B":SUCCESS,height:5,borderRadius:4,transition:"transform 0.4s"}}/>
            </div>
            {stats.sunday>MAX_SUNDAY && <p style={{color:DANGER,fontSize:11,margin:"6px 0 0",fontWeight:600}}>Limit exceeded</p>}
          </div>
          {stats.overtime>0 && (
            <div style={{marginTop:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:MUTED,fontSize:13}}>Overtime</span>
                <span style={{color:"#F59E0B",fontWeight:700,fontSize:13}}>{fmtHrs(stats.overtime)} <span style={{color:MUTED,fontWeight:400,fontSize:11}}>not counted toward limit</span></span>
              </div>
              <div style={{background:BORDER,borderRadius:4,height:5}}>
                <div style={{width:"100%",background:"#F59E0B44",height:5,borderRadius:4}}/>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── LOG SHIFT SCREEN ─────────────────────────────────────────────────────────
function LogScreen({period, editShift, lookupDuty, initialDate, initialRestDay, onSave, onCancel}) {
  // lookupDuty = {d: dutyObj, dt: dayType} from the Lookup screen
  const initZone = lookupDuty?.d.z || editShift?.zone || "Zone 1";
  const [date, setDate] = useState(lookupDuty?.date || editShift?.date || initialDate || today());
  const [zone, setZone] = useState(initZone);
  const [rIdx, setRIdx] = useState(-1);

  function decToHM(dec) {
    const h = Math.floor(dec || 0), m = Math.round(((dec||0) - h) * 60);
    return {h, m};
  }
  function parseHM(t) {
    if (!t) return {h:0, m:0};
    const [h, m] = t.split(":").map(Number);
    return {h: h||0, m: m||0};
  }
  // Convert sign-off string (may be "24:15") to time input value + nextDay flag
  function splitSignOff(t) {
    if (!t) return {val:"00:00", nd:false};
    const [h, m] = t.split(":").map(Number);
    if (h >= 24) return {val:`${String(h-24).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`, nd:true};
    return {val:`${String(h).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`, nd:false};
  }

  const initReport = lookupDuty?.d.s || editShift?.reportTime || "";
  const initSO = splitSignOff(lookupDuty?.d.e || editShift?.signOffTime);
  const wi = lookupDuty ? decToHM(lookupDuty.d.w) : decToHM(editShift?.workHours);
  const ri = lookupDuty ? decToHM(lookupDuty.d.l) : decToHM(editShift?.reliefHours);

  const [reportTime, setReportTime] = useState(initReport);
  const [signOffVal, setSignOffVal] = useState(initSO.val);   // "HH:MM" 00-23
  const [nextDay, setNextDay] = useState(initSO.nd);           // adds 24h
  const [workH, setWorkH] = useState(wi.h);
  const [workM, setWorkM] = useState(wi.m);
  const [reliefH, setReliefH] = useState(ri.h);
  const [reliefM, setReliefM] = useState(ri.m);
  const [notes, setNotes] = useState(editShift?.notes || "");
  const [isSpare, setIsSpare] = useState(editShift?.isSpare || false);
  const [fixedType, setFixedType] = useState(editShift?.fixedType || null);
  const [isRestDay, setIsRestDay] = useState(editShift?.isRestDay || initialRestDay || false);
  const [overtimeH, setOvertimeH] = useState(Math.floor(editShift?.overtimeHours||0));
  const [overtimeM, setOvertimeM] = useState(Math.round(((editShift?.overtimeHours||0)%1)*60));
  const [overtimeNote, setOvertimeNote] = useState(editShift?.overtimeNote || "");
  const [pendingAction, setPendingAction] = useState(null); // {msg, run} — confirm before wiping entered times
  const [extraDays, setExtraDays] = useState([]); // additional dates (same week as `date`) to also log this duty on

  function hasEnteredTimes() {
    return !!reportTime || signOffVal!=="00:00" || workH>0 || workM>0 || reliefH>0 || reliefM>0;
  }
  function guardedRun(msg, run) {
    if (hasEnteredTimes()) setPendingAction({msg, run}); else run();
  }

  // Use lookupDuty's dayType for duty filtering when coming from Lookup
  // so the right duties show regardless of today's day
  const dateDayType = getDayType(date);
  const dutyDayType = lookupDuty ? lookupDuty.dt : dateDayType;
  const duties = useMemo(() => getDuties(zone, dutyDayType), [zone, dutyDayType]);
  const dayLabel = dateDayType==="sunday"?"Sunday":dateDayType==="saturday"?"Saturday":"Mon–Fri";
  const dayColor = dateDayType==="sunday"?SUCCESS:dateDayType==="saturday"?"#60a5fa":MUTED;

  useEffect(() => {
    const roster = lookupDuty?.d.r || editShift?.roster;
    if (roster && duties.length > 0) {
      const i = duties.findIndex(d => d.r === roster);
      if (i >= 0) { setRIdx(i); return; }
    }
    if (!lookupDuty && !editShift) setRIdx(-1);
  }, [zone, dutyDayType]);

  function pick(i) {
    setRIdx(i);
    if (i >= 0 && duties[i]) {
      const d = duties[i];
      setReportTime(d.s);
      const so = splitSignOff(d.e); setSignOffVal(so.val); setNextDay(so.nd);
      const wh = decToHM(d.w); setWorkH(wh.h); setWorkM(wh.m);
      const rh = decToHM(d.l); setReliefH(rh.h); setReliefM(rh.m);
    }
  }

  // Build sign-off string — add 24h if next day
  function buildSignOff() {
    if (!signOffVal) return "00:00";
    const [h, m] = signOffVal.split(":").map(Number);
    const fh = nextDay ? h + 24 : h;
    return `${String(fh).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }

  const signOffStr = buildSignOff();
  const inRange = inPeriod(date, period);
  // Same date already has another shift logged (never valid — one driver, one duty a day)
  const conflictShift = (period.shifts||[]).find(s => s.date === date && s.id !== editShift?.id);
  // Same date already has a day off logged (Annual Leave, Sick Day, etc.) — flag, don't block
  const conflictDayOff = (period.daysOff||[]).find(d => d.date === date);
  const canSave = (rIdx >= 0 || isSpare || fixedType) && date && reportTime && signOffVal && inRange;
  const saveBlockReason = !date ? "Pick a date."
    : !inRange ? "This date falls outside the current 5-week period."
    : !(rIdx >= 0 || isSpare || fixedType) ? "Pick a duty, or choose Spare / another duty type."
    : (!reportTime || !signOffVal) ? "Enter a start and finish time."
    : null;
  const spreadover = reportTime && signOffVal ? calcSpreadover(reportTime, signOffStr) : null;
  const fixedDef = fixedType ? FIXED_DUTY_TYPES.find(f => f.key === fixedType) : null;

  // For fixed-duration duty types (CPC/Training, spares), auto-calc finish from start + fixed duration
  function handleFixedReportChange(v) {
    setReportTime(v);
    if (fixedDef && v) {
      const so = splitSignOff(addDuration(v, fixedDef.hours + (fixedDef.breakHours||0)));
      setSignOffVal(so.val); setNextDay(so.nd);
    }
  }

  function selectFixedType(key) {
    const active = fixedType === key;
    setFixedType(active ? null : key);
    setIsSpare(false); setRIdx(-1);
    setReportTime(""); setSignOffVal("00:00"); setNextDay(false);
    setExtraDays([]);
  }

  function shiftFields() {
    const duty = (isSpare || fixedType) ? null : duties[rIdx];
    return {
      zone,
      roster: fixedDef ? fixedDef.roster : (isSpare ? "Spare" : duty.r),
      duty: fixedType ? fixedType : (isSpare ? "spare" : duty.d2),
      fixedType: fixedType || null,
      reportTime, signOffTime: signOffStr,
      workHours: fixedDef ? fixedDef.hours : isSpare ? calcSpreadover(reportTime, signOffStr) : workH + workM/60,
      reliefHours: (isSpare || fixedType) ? 0 : reliefH + reliefM/60,
      isSpare, isRestDay,
      overtimeHours: overtimeH + overtimeM/60,
      overtimeNote: overtimeNote.trim(),
      notes: notes.trim()
    };
  }

  function performSave(overwriteId) {
    if (extraDays.length > 0) {
      const fields = shiftFields();
      const allDates = [date, ...extraDays];
      onSave(allDates.map(d => ({
        id: d === date ? (overwriteId || editShift?.id || uid()) : uid(),
        date: d, dayType: getDayType(d), ...fields
      })));
      return;
    }
    onSave({ id: overwriteId || editShift?.id || uid(), date, dayType: getDayType(date), ...shiftFields() });
  }

  function handleSave() {
    if (!canSave) return;
    // Overwrite-confirm intentionally also covers the extra-days case (not just a plain
    // single date) - the primary date is never greyed out in the day-circle picker and can
    // still conflict, so this branch has to fire regardless of extraDays.length or the
    // primary date's own save silently gets dropped by saveShift's collision guard.
    if (!editShift && conflictShift) {
      const dutyName = (rIdx>=0 && duties[rIdx]) ? duties[rIdx].r : "";
      const msg = extraDays.length>0
        ? `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}), and log ${dutyName} on ${extraDays.length} more day${extraDays.length!==1?"s":""}: ${extraDays.map(fmtDate).join(", ")} — continue?`
        : `This will replace the shift already logged for ${fmtDate(date)} (${conflictShift.roster}) — continue?`;
      setPendingAction({ msg, run: () => performSave(conflictShift.id) });
      return;
    }
    if (extraDays.length > 0) {
      setPendingAction({
        msg: `Log ${(rIdx>=0 && duties[rIdx]) ? duties[rIdx].r : ""} on ${1+extraDays.length} days: ${[date, ...extraDays].map(fmtDate).join(", ")}?`,
        run: () => performSave()
      });
      return;
    }
    performSave();
  }

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {initialRestDay && isRestDay && (
        <div style={{margin:"12px 16px 0",background:`${DANGER}18`,border:`1px solid ${DANGER}44`,borderRadius:12,padding:"10px 14px"}}>
          <p style={{color:DANGER,fontSize:13,fontWeight:600,margin:0}}>Logging this as overtime — you're on a scheduled rest day.</p>
        </div>
      )}
      <PageHeader eyebrow={editShift?"Editing":lookupDuty?"From Lookup":"New entry"} title={editShift?"Edit Shift":"Log a Shift"} onBack={onCancel}/>

      <div style={{padding:"4px 16px 0"}}>
        {lookupDuty && (
          <div style={{background:`${ACCENT}14`,border:`1px solid ${ACCENT}44`,borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p style={{color:ACCENT,fontSize:13,margin:0,fontWeight:600}}>Pre-filled from Lookup — check the date and save</p>
          </div>
        )}
        {/* Date */}
        <div style={{marginBottom:16}}>
          <FieldLabel htmlFor="log-date">Date</FieldLabel>
          <DateInput id="log-date" value={date} onChange={e => {setDate(e.target.value); setExtraDays([]);}} invalid={!inRange && !!date}/>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <span style={tag(dayColor)}>{dayLabel}</span>
          </div>
          {!inRange && date && (
            <p style={{color:DANGER,fontSize:12,margin:"8px 0 0",fontWeight:600}}>This date falls outside the current 5-week period ({fmtShort(period.startDate)} – {fmtShort(addDays(period.startDate,34))}).</p>
          )}
          {conflictShift && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,padding:"10px 12px",background:`${DANGER}14`,border:`1px solid ${DANGER}44`,borderRadius:10}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:DANGER,flexShrink:0}}/>
              <p style={{color:DANGER,fontSize:13,margin:0}}>A shift ({conflictShift.roster}) is already logged for this date. Edit or delete it first, or pick a different date.</p>
            </div>
          )}
          {!conflictShift && conflictDayOff && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,padding:"10px 12px",background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0}}/>
              <p style={{color:"#F59E0B",fontSize:13,margin:0}}>{conflictDayOff.type} is already logged for this date. Saving a shift will keep both records — check that's right.</p>
            </div>
          )}
        </div>

        {/* Zone */}
        <div style={{marginBottom:16}}>
          <FieldLabel>Zone</FieldLabel>
          <SegGroup options={ZONES} value={zone} cols={4}
            onChange={z=>{
              if (z===zone) return;
              guardedRun("Changing zone will clear the times you've already entered. Continue?", ()=>{
                setZone(z);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setReliefH(0);setReliefM(0);setExtraDays([]);
              });
            }}/>
        </div>

        {/* Duty */}
        {!isSpare && !fixedType && (
          <div style={{marginBottom:16}}>
            <FieldLabel hint={`${duties.length} for ${dayLabel}`}>Duty</FieldLabel>
            <DutyPicker key={zone+dutyDayType} duties={duties} value={rIdx} onChange={pick}/>
          </div>
        )}

        {/* Also log this duty on other days this week — replaces the old standalone Repeat Duty screen */}
        {!editShift && !isSpare && !fixedType && date && (
          <div style={{marginBottom:16}}>
            <FieldLabel hint="optional">Also log this duty on</FieldLabel>
            <div style={{display:"flex",gap:6,justifyContent:"space-between"}}>
              {(() => {
                const weekStart = sundayOf(date);
                const letters = ["S","M","T","W","T","F","S"];
                const taken = new Set((period.shifts||[]).map(s=>s.date));
                return Array.from({length:7},(_,i)=>{
                  const d = addDays(weekStart, i);
                  const isPrimary = d === date;
                  const isTaken = taken.has(d) && !isPrimary;
                  const sel = extraDays.includes(d);
                  return (
                    <button key={d} type="button" disabled={isPrimary || isTaken}
                      onClick={()=>setExtraDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])}
                      style={{
                        width:36, height:36, borderRadius:"50%",
                        background: (isPrimary || sel) ? ACCENT : isTaken ? CARD : CARD2,
                        color: (isPrimary || sel) ? "#07090F" : isTaken ? MUTED : TEXT,
                        border: (isPrimary || sel) ? "none" : `1px solid ${BORDER}`,
                        fontSize:12, fontWeight:700, cursor: (isPrimary || isTaken) ? "not-allowed" : "pointer",
                        opacity: isTaken ? 0.5 : 1
                      }}>{letters[i]}</button>
                  );
                });
              })()}
            </div>
            {extraDays.length>0 && (
              <p style={{color:MUTED,fontSize:12,margin:"8px 0 0"}}>Will log on {1+extraDays.length} days total{rIdx>=0 && duties[rIdx] ? ` (${duties[rIdx].r})` : ""}</p>
            )}
          </div>
        )}

        {/* Spare driver toggle — compact, sits between duty and shift details */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,padding:"10px 14px",background:CARD,border:`1px solid ${isSpare?ACCENT:BORDER}`,borderRadius:12,cursor:"pointer"}} onClick={()=>{
          guardedRun("Toggling Spare will clear the times you've already entered. Continue?", ()=>{
            const ns=!isSpare;setIsSpare(ns);if(ns)setFixedType(null);setRIdx(-1);setReportTime("");setSignOffVal("00:00");setNextDay(false);setWorkH(0);setWorkM(0);setExtraDays([]);
          });
        }}>
          <span style={{color:isSpare?ACCENT:MUTED,fontSize:13,fontWeight:600}}>Spare driver shift</span>
          <div style={{width:40,height:24,borderRadius:12,background:isSpare?ACCENT:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isSpare?19:3,transition:"left 0.2s"}}/>
          </div>
        </div>

        {/* Other duty types — CPC/Training & fixed-duration spares */}
        <div style={{marginBottom:16}}>
          <FieldLabel>Other duty types</FieldLabel>
          <p style={{color:MUTED,fontSize:11,margin:"-6px 0 10px"}}>CPC/Training = Certificate of Professional Competence</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {FIXED_DUTY_TYPES.map(f => {
              const active = fixedType === f.key;
              return (
                <button key={f.key} onClick={()=>selectFixedType(f.key)} style={{
                  background:active?ACCENT:CARD, color:active?"#07090F":MUTED,
                  border:`1px solid ${active?ACCENT:BORDER}`, borderRadius:10,
                  padding:"10px 6px", fontSize:12, fontWeight:600, cursor:"pointer",
                  textAlign:"center", lineHeight:1.3
                }}>
                  {f.label}
                  <div style={{fontSize:10,fontWeight:400,opacity:0.85,marginTop:2}}>{fmtHrs(f.hours)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift details */}
        {(rIdx>=0 || isSpare || fixedType) && (
          <div style={{...cardStyle,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <FieldLabel>{fixedDef ? (fixedDef.full||fixedDef.label) : isSpare?"Spare shift times":"Shift details"}</FieldLabel>
              {!isSpare && !fixedType && <span style={{color:MUTED,fontSize:11,marginTop:-8}}>adjust if needed</span>}
            </div>

            {fixedType ? (
              /* Fixed-duration duty: just a start time, finish is auto-calculated */
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <FieldLabel>Start time</FieldLabel>
                  <input type="time" value={reportTime} onChange={e=>handleFixedReportChange(e.target.value)} style={inputStyle}/>
                </div>
                <div>
                  <FieldLabel>Finish (auto)</FieldLabel>
                  <div style={{...inputStyle,color:TEXT,fontWeight:600}}>
                    {reportTime ? `${signOffVal}${nextDay?" +1":""}` : "—"}
                  </div>
                </div>
              </div>
            ) : (
              /* Report + Sign off — two time pickers side by side */
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:!isSpare?14:0}}>
                <div>
                  <FieldLabel htmlFor="log-report">Report</FieldLabel>
                  <input id="log-report" type="time" value={reportTime} onChange={e=>setReportTime(e.target.value)} style={inputStyle}/>
                </div>
                <div>
                  <FieldLabel htmlFor="log-signoff">Sign off</FieldLabel>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input id="log-signoff" type="time" value={signOffVal} onChange={e=>setSignOffVal(e.target.value)} style={{...inputStyle,flex:1,minWidth:0}}/>
                    <button onClick={()=>setNextDay(!nextDay)} style={{
                      background:nextDay?ACCENT:CARD2,color:nextDay?"#07090F":MUTED,
                      border:`1px solid ${nextDay?ACCENT:BORDER}`,borderRadius:8,
                      padding:"10px 7px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0
                    }}>+1</button>
                  </div>
                  {nextDay&&<p style={{color:ACCENT,fontSize:11,margin:"3px 0 0"}}>Next day</p>}
                </div>
              </div>
            )}

            {/* Work + Relief — display tiles, not editable number boxes */}
            {!isSpare && !fixedType && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <FieldLabel>Work</FieldLabel>
                  <div style={{...inputStyle,color:TEXT,fontWeight:600}}>{workH>0||workM>0?fmtHrs(workH+workM/60):"—"}</div>
                </div>
                <div>
                  <FieldLabel>Relief</FieldLabel>
                  <div style={{...inputStyle,color:reliefH>0||reliefM>0?TEXT:MUTED,fontWeight:reliefH>0||reliefM>0?600:400}}>{reliefH>0||reliefM>0?fmtHrs(reliefH+reliefM/60):"—"}</div>
                </div>
              </div>
            )}
            {spreadover !== null && (
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"16px 0 0",paddingTop:14,borderTop:`1px solid ${BORDER}`}}>
                <span style={{color:MUTED,fontSize:13}}>Spreadover</span>
                <span style={{color:ACCENT,fontSize:15,fontWeight:700}}>{fmtHrs(spreadover)}</span>
                {!isSpare&&!fixedType&&duties[rIdx]?.b&&duties[rIdx]?.bs&&<span style={{color:MUTED,fontSize:12,marginLeft:"auto"}}>Break at {duties[rIdx].bs}</span>}
              </div>
            )}
          </div>
        )}

        {/* Rest day working toggle */}
        {(rIdx>=0 || isSpare || fixedType) && (
          <div style={{...cardStyle,marginBottom:16,padding:"14px 16px",border:isRestDay?`1px solid ${DANGER}44`:`1px solid ${BORDER}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setIsRestDay(!isRestDay)}>
              <div>
                <p style={{color:isRestDay?DANGER:TEXT,fontSize:14,fontWeight:600,margin:0}}>Working on a rest day</p>
                <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>All hours count as overtime — excluded from 190h limit</p>
              </div>
              <div style={{width:44,height:26,borderRadius:13,background:isRestDay?DANGER:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:isRestDay?21:3,transition:"left 0.2s"}}/>
              </div>
            </div>
          </div>
        )}

        {/* Overtime section */}
        {(rIdx>=0 || isSpare || fixedType) && !isRestDay && (
          <div style={{...cardStyle,marginBottom:16}}>
            <FieldLabel htmlFor="log-ot-h" hint="optional">Overtime hours</FieldLabel>
            <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Extra time worked on top of this duty — tracked separately, doesn't count toward 190h</p>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
              <input id="log-ot-h" type="number" min="0" max="12" value={overtimeH} onChange={e=>setOvertimeH(Math.min(12,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
              <span style={{color:MUTED,fontSize:13}}>h</span>
              <input type="number" min="0" max="59" value={overtimeM} onChange={e=>setOvertimeM(Math.min(59,Math.max(0,parseInt(e.target.value)||0)))} style={{...inputStyle,padding:"12px 8px",textAlign:"center",minWidth:58}} />
              <span style={{color:MUTED,fontSize:13}}>m</span>
            </div>
            {(overtimeH > 0 || overtimeM > 0) && (
              <div>
                <FieldLabel htmlFor="log-ot-note" hint="optional">What was this overtime for?</FieldLabel>
                <textarea id="log-ot-note" value={overtimeNote} onChange={e=>setOvertimeNote(e.target.value)}
                  placeholder="e.g. covered part of duty, late relief, traffic delay"
                  style={{...inputStyle,minHeight:64,resize:"vertical",fontFamily:"inherit",lineHeight:1.5}} />
              </div>
            )}
          </div>
        )}

        {/* Notes — only show once a duty is selected */}
        {(rIdx>=0 || isSpare || fixedType) && (
          <div style={{marginBottom:20}}>
            <FieldLabel htmlFor="log-notes" hint="optional">Notes</FieldLabel>
            <textarea id="log-notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. duty changed at short notice, covered for a colleague"
              style={{...inputStyle,minHeight:72,resize:"vertical",fontFamily:"inherit",lineHeight:1.5}} />
          </div>
        )}

        <button style={{...btnStyle,opacity:canSave?1:0.4,cursor:canSave?"pointer":"not-allowed"}} onClick={handleSave} disabled={!canSave}>
          {editShift ? "Save Changes" : extraDays.length>0 ? `Log ${1+extraDays.length} days` : "Log Shift"}
        </button>
        {!canSave && saveBlockReason && (
          <p style={{color:MUTED,fontSize:12,margin:"8px 0 0",textAlign:"center"}}>{saveBlockReason}</p>
        )}

        {pendingAction && (
          <ConfirmDialog msg={pendingAction.msg} yesLabel="Continue" danger={false}
            onYes={()=>{pendingAction.run();setPendingAction(null);}}
            onNo={()=>setPendingAction(null)}/>
        )}
      </div>
    </div>
  );
}

// ─── LOG DAY OFF SCREEN ───────────────────────────────────────────────────────
function LogDayOffScreen({periods, editDayOff, onSave, onCancel}) {
  const [type, setType] = useState(editDayOff?.type || DAY_OFF_TYPES[0]);
  const [date, setDate] = useState(editDayOff?.date || today());
  // Range mode for Annual Leave
  const [rangeTo, setRangeTo] = useState(editDayOff?.date || today());
  const isRange = !editDayOff;

  // Generate all calendar days between from and to inclusive
  function getDaysInRange(from, to) {
    const days = [];
    let cur = from;
    while (cur <= to) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }

  const rangeDays = isRange ? getDaysInRange(date, rangeTo < date ? date : rangeTo) : [];
  const rangeCount = rangeDays.length;

  const allShifts = useMemo(()=>periods.flatMap(p=>p.shifts||[]), [periods]);
  const conflictDates = (isRange ? rangeDays : [date]).filter(d => allShifts.some(s=>s.date===d));

  function handleSave() {
    if (isRange && rangeCount > 0) {
      onSave(rangeDays.map(d => ({id:uid(), date:d, type})));
    } else {
      onSave({id:editDayOff?.id||uid(), date, type});
    }
  }

  const canSave = date && (isRange ? rangeCount > 0 : true);

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <PageHeader eyebrow={editDayOff?"Editing":"New entry"} title={editDayOff?"Edit Day Off":"Log Day Off"} onBack={onCancel}/>

      <div style={{padding:"4px 16px 0"}}>

        {/* Type selector */}
        <div style={{marginBottom:20}}>
          <FieldLabel>Type</FieldLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {DAY_OFF_TYPES.map(t=>{
              const sel = type===t;
              return (
                <button key={t} onClick={()=>setType(t)} style={{
                  background: sel?`${ACCENT}18`:CARD,
                  border:`1px solid ${sel?ACCENT:BORDER}`,
                  borderRadius:12, padding:"14px 12px", cursor:"pointer",
                  textAlign:"left", display:"flex",alignItems:"center",gap:10
                }}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:sel?ACCENT:BORDER,flexShrink:0}}/>
                  <span style={{color:sel?TEXT:MUTED,fontSize:14,fontWeight:sel?700:500}}>{t}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date — single or range */}
        {isRange ? (
          <div style={{marginBottom:20}}>
            <FieldLabel>Date range</FieldLabel>
            <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Select the first and last day — all days in between will be logged. Logging just one day? Leave From and To the same.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 6px"}}>From</p>
                <DateInput value={date} onChange={e=>setDate(e.target.value)}/>
              </div>
              <div>
                <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 6px"}}>To</p>
                <DateInput value={rangeTo < date ? date : rangeTo} onChange={e=>setRangeTo(e.target.value)} min={date}/>
              </div>
            </div>
            {rangeCount > 0 && (
              <div style={{background:`${ACCENT}14`,border:`1px solid ${ACCENT}33`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:ACCENT,fontSize:18}}>📅</span>
                <p style={{color:ACCENT,fontSize:13,fontWeight:700,margin:0}}>
                  {rangeCount} day{rangeCount!==1?"s":""} of {type}
                  {rangeCount > 1 ? ` · ${fmtDate(date)} to ${fmtDate(rangeTo < date ? date : rangeTo)}` : ""}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{marginBottom:20}}>
            <FieldLabel>Date</FieldLabel>
            <DateInput value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
        )}

        {conflictDates.length > 0 && (
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:16,padding:"10px 12px",background:"#F59E0B14",border:"1px solid #F59E0B44",borderRadius:10}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0,marginTop:6}}/>
            <p style={{color:"#F59E0B",fontSize:13,margin:0}}>
              {conflictDates.length===1 ? `A shift is already logged on ${fmtDate(conflictDates[0])}.` : `${conflictDates.length} of these days already have a shift logged.`} Saving will keep both records — check that's right.
            </p>
          </div>
        )}

        <button style={{...btnStyle,opacity:canSave?1:0.4}} disabled={!canSave} onClick={handleSave}>
          {editDayOff ? "Save Changes" : isRange && rangeCount > 1 ? `Log ${rangeCount} Days` : "Log Day Off"}
        </button>
      </div>
    </div>
  );
}

// ─── PERIOD SCREEN ────────────────────────────────────────────────────────────
function PeriodScreen({period, onEdit, onDelete, onEditDayOff, onDeleteDayOff, onViewArchive, onEndPeriod, initWeek=null, readOnly=false}) {
  const stats = useMemo(() => pStats(period), [period]);
  // Default to current week, fallback to week 0
  const defaultWeek = useMemo(() => {
    const td = today();
    const i = stats.weeks.findIndex(w => td >= w.start && td <= w.end);
    return i >= 0 ? i : 0;
  }, [stats]);
  const [open, setOpen] = useState(initWeek !== null ? initWeek : defaultWeek);
  const tallyEntries = DAY_OFF_TYPES.map(t=>({type:t,count:stats.tally[t]||0})).filter(x=>x.count>0);

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <PageHeader
        eyebrow={readOnly?"Archived period":"Current period"}
        title="Period Detail"
        subtitle={`${fmtDate(period.startDate)} – ${fmtDate(addDays(period.startDate,34))}`}
        right={!readOnly && (
          <button onClick={()=>exportPDF(period,stats)} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:800,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            Export PDF
          </button>
        )}
      />

      <div style={{padding:"4px 16px 0"}}>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        <ComplianceBar label="Total Hours" current={stats.total} max={MAX_HOURS} limitLabel="190h 4m" />
        <ComplianceBar label="Sunday Hours" current={stats.sunday} max={MAX_SUNDAY} limitLabel="14h 30m" />
        {stats.overtime>0 && (
          <div style={{...cardStyle,padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:MUTED,fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Overtime</span>
              <span style={{color:"#F59E0B",fontWeight:800,fontSize:16}}>{fmtHrs(stats.overtime)}</span>
            </div>
            <p style={{color:MUTED,fontSize:11,margin:"3px 0 0"}}>Not counted toward 190h limit</p>
          </div>
        )}
      </div>

      <div style={{...cardStyle,marginBottom:12}}>
        <p style={{color:TEXT,fontWeight:600,margin:"0 0 8px",fontSize:14}}>Period Summary</p>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:MUTED,fontSize:13}}>Max consecutive days</span>
          <span style={{color:TEXT,fontWeight:600}}>{stats.consec}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:MUTED,fontSize:13}}>Total shifts</span>
          <span style={{color:TEXT,fontWeight:600}}>{period.shifts?.length||0}</span>
        </div>
        {tallyEntries.length > 0 && (
          <div style={{borderTop:`1px solid ${BORDER}`,marginTop:8,paddingTop:8}}>
            <p style={{color:MUTED,fontSize:12,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:0.5}}>Days Off</p>
            {tallyEntries.map(({type,count})=>(
              <div key={type} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{color:MUTED,fontSize:13}}>{type}</span>
                <span style={{color:TEXT,fontWeight:600}}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          <button onClick={onViewArchive} style={{...btnStyle,padding:"12px 16px",fontSize:13}}>
            View Period Archive
          </button>
        </div>
      )}

      {stats.weeks.map((w,i)=>{
        const allItems = [
          ...w.shifts.map(s=>({...s,_type:"shift"})),
          ...(w.daysOff||[]).map(d=>({...d,_type:"dayoff"}))
        ].sort((a,b)=>a.date.localeCompare(b.date));
        const isCurrentWeek = !readOnly && i===defaultWeek;
        return (
          <div key={i} style={{...cardStyle,marginBottom:10,...(isCurrentWeek?{border:`1px solid ${ACCENT}`,boxShadow:`0 0 0 2px ${ACCENT}40`}:{})}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setOpen(open===i?-1:i)}>
              <div>
                <p style={{color:MUTED,fontSize:11,margin:0,textTransform:"uppercase"}}>Week {i+1}</p>
                <p style={{color:TEXT,fontWeight:600,margin:"3px 0 0"}}>{fmtShort(w.start)} – {fmtShort(w.end)}</p>
                <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{w.shifts.length} shift{w.shifts.length!==1?"s":""}{(w.daysOff?.length||0)>0?` · ${w.daysOff.length} day off`:""}</p>
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <p style={{color:w.total>0?ACCENT:MUTED,fontWeight:700,fontSize:16,margin:0}}>{fmtHrs(w.total)}</p>
                {w.sunday>0&&<p style={{color:SUCCESS,fontSize:12,margin:0}}>Sun: {fmtHrs(w.sunday)}</p>}
                {w.overtime>0&&<p style={{color:"#F59E0B",fontSize:12,margin:0}}>OT: {fmtHrs(w.overtime)}</p>}
                <span style={{color:MUTED,fontSize:13,transform:open===i?"rotate(180deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>▾</span>
              </div>
            </div>
            {open===i&&(
              <div style={{marginTop:12,borderTop:`1px solid ${BORDER}`,paddingTop:12}}>
                {allItems.length===0?(
                  <EmptyState
                    icon={<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>}
                    title="No entries this week"
                    body="Log a shift or a day off to see it here."
                  />
                ):allItems.map(item=>item._type==="shift"?(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{color:item.isRestDay?DANGER:TEXT,fontSize:15,fontWeight:700}}>{item.roster}</span>
                        <span style={tag(getDayType(item.date)==="sunday"?SUCCESS:getDayType(item.date)==="saturday"?"#60a5fa":MUTED)}>
                          {getDayType(item.date)==="sunday"?"Sun":getDayType(item.date)==="saturday"?"Sat":"M-F"}
                        </span>
                        {item.isSpare&&<span style={tag(ACCENT)}>Spare</span>}
                        {item.isRestDay&&<span style={tag(DANGER)}>Rest day</span>}
                        {item.overtimeHours>0&&!item.isRestDay&&<span style={tag("#F59E0B")}>OT {fmtHrs(item.overtimeHours)}</span>}
                      </div>
                      <p style={{color:MUTED,fontSize:12,margin:"0 0 1px"}}>{fmtDate(item.date)} · {item.zone}</p>
                      <p style={{color:MUTED,fontSize:12,margin:0}}>{item.reportTime} – {item.signOffTime} · Spread: {fmtHrs(calcSpreadover(item.reportTime,item.signOffTime))}</p>
                      {item.overtimeNote&&<p style={{color:"#F59E0B",fontSize:12,margin:"3px 0 0",fontStyle:"italic"}}>OT: {item.overtimeNote}</p>}
                      {item.notes && <p style={{color:"#60a5fa",fontSize:12,margin:"3px 0 0",fontStyle:"italic"}}>{item.notes}</p>}
                    </div>
                    <div style={{textAlign:"right",marginLeft:10,flexShrink:0}}>
                      <p style={{color:item.isRestDay?DANGER:ACCENT,fontWeight:700,margin:"0 0 6px"}}>{fmtHrs(item.workHours||0)}</p>
                      {!readOnly&&(
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <button onClick={()=>onEdit(item)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>onDelete(item.id)} style={{background:"none",border:`1px solid ${DANGER}`,color:DANGER,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Del</button>
                        </div>
                      )}
                    </div>
                  </div>
):(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <p style={{color:MUTED,fontSize:13,fontStyle:"italic",margin:0}}>{item.type}</p>
                        {item.fixed && <span style={tag(MUTED)}>Fixed</span>}
                      </div>
                      <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{fmtDate(item.date)}</p>
                    </div>
                    {!readOnly&&(
                      item.fixed ? (
                        <button onClick={()=>onDeleteDayOff(item.id)} style={{background:"none",border:`1px solid ${BORDER}`,color:MUTED,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Remove</button>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <button onClick={()=>onEditDayOff(item)} style={{background:"none",border:`1px solid ${ACCENT}`,color:ACCENT,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>onDeleteDayOff(item.id)} style={{background:"none",border:`1px solid ${DANGER}`,color:DANGER,borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Del</button>
                        </div>
                      )
                    )}
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:4}}>
                  <span style={{color:MUTED,fontSize:13,fontWeight:600}}>Week {i+1} Total</span>
                  <span style={{color:ACCENT,fontWeight:700}}>{fmtHrs(w.total)}
                    {w.sunday>0&&<span style={{color:SUCCESS,fontWeight:400}}> / Sun: {fmtHrs(w.sunday)}</span>}
                    {w.overtime>0&&<span style={{color:"#F59E0B",fontWeight:400}}> / OT: {fmtHrs(w.overtime)}</span>}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <button onClick={onEndPeriod} style={{...btnStyle,marginTop:4,marginBottom:12}}>
          {today() > addDays(period.startDate,34) ? "This period has ended — start a new one" : "End period & start new"}
        </button>
      )}
      </div>
    </div>
  );
}

// Reusable empty-state — icon + heading + explanatory copy, consistent everywhere a list can be empty.
function EmptyState({icon, title, body}) {
  return (
    <div style={{...cardStyle,textAlign:"center",padding:"28px 20px"}}>
      {icon && <div style={{opacity:0.4,marginBottom:10,display:"flex",justifyContent:"center"}}>{icon}</div>}
      <p style={{color:TEXT,margin:"0 0 4px",fontSize:14,fontWeight:600}}>{title}</p>
      {body && <p style={{color:MUTED,fontSize:12,margin:0,lineHeight:1.5}}>{body}</p>}
    </div>
  );
}

// ─── ARCHIVE SCREEN ────────────────────────────────────────────────────────────
function ArchiveScreen({periods, activePeriodId, onStartNew, onView}) {
  const archived = [...periods].filter(p=>p.id!==activePeriodId).reverse();
  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <PageHeader eyebrow="Past periods" title="Archive" subtitle={archived.length>0?`${archived.length} archived period${archived.length!==1?"s":""}`:undefined}/>
      <div style={{padding:"4px 16px 0"}}>
      <button style={{...btnStyle,marginBottom:20}} onClick={onStartNew}>Start New Period</button>
      {archived.length===0?(
        <EmptyState
          icon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l1.5-4h15L21 7"/><rect x="3" y="7" width="18" height="14" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/></svg>}
          title="No archived periods yet"
          body="When you start a new period, the current one moves here for safe keeping."
        />
      ):archived.map(p=>{
        const st=pStats(p);
        return (
          <div key={p.id} style={{...cardStyle,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <p style={{color:TEXT,fontWeight:700,margin:"0 0 3px",fontSize:15}}>{fmtShort(p.startDate)} – {fmtShort(addDays(p.startDate,34))}</p>
                <p style={{color:MUTED,fontSize:13,margin:0}}>{p.shifts?.length||0} shifts · {p.daysOff?.length||0} days off</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:ACCENT,fontWeight:800,margin:"0 0 2px",fontSize:16}}>{fmtHrs(st.total)}</p>
                <p style={{color:SUCCESS,fontSize:12,margin:0}}>Sun: {fmtHrs(st.sunday)}</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>onView(p.id)} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"11px 0",fontSize:14,fontWeight:600,cursor:"pointer"}}>View</button>
              <button onClick={()=>exportPDF(p,st)} style={{background:ACCENT,color:"#07090F",border:"none",borderRadius:10,padding:"11px 0",fontSize:14,fontWeight:800,cursor:"pointer"}}>Export PDF</button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ─── LEAVE SCREEN HELPERS ─────────────────────────────────────────────────────
function DayList({items, emptyMsg}) {
  if(items.length===0) return <p style={{color:MUTED,fontSize:13,margin:"8px 0 0",lineHeight:1.5}}>{emptyMsg}</p>;
  return (
    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
      {items.map((d,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<items.length-1?`1px solid ${BORDER}`:undefined}}>
          <span style={{color:TEXT,fontSize:13}}>{fmtDate(d.date)}</span>
          <span style={{color:MUTED,fontSize:12}}>{new Date(d.date+"T00:00:00").toLocaleDateString("en-IE",{weekday:"short"})}</span>
        </div>
      ))}
    </div>
  );
}

function TrafficDot({color}) {
  return <div style={{width:12,height:12,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}88`,flexShrink:0}}/>;
}

function LeaveCard({title, subtitle, color, used, total, remaining, children}) {
  const [open,setOpen] = useState(false);
  return (
    <div style={{background:CARD,border:`1px solid ${color}44`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <TrafficDot color={color}/>
            <div>
              <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:0}}>{title}</p>
              {subtitle&&<p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>{subtitle}</p>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            {total!==undefined ? (
              <>
                <p style={{color:color,fontSize:18,fontWeight:800,margin:0}}>{remaining} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>left</span></p>
                <p style={{color:MUTED,fontSize:11,margin:"1px 0 0"}}>{used} of {total} used</p>
              </>
            ) : (
              <p style={{color:color,fontSize:18,fontWeight:800,margin:0}}>{used} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>used</span></p>
            )}
            <span style={{color:MUTED,fontSize:11,display:"block",marginTop:3}}>{open?"▲ hide":"▼ dates"}</span>
          </div>
        </div>
      </div>
      {open&&<div style={{padding:"0 16px 14px",borderTop:`1px solid ${BORDER}`}}>{children}</div>}
    </div>
  );
}

// Self Cert — same collapsible header/tap pattern as LeaveCard, but keeps its
// own two-half-year body since it tracks two independent 2-day allowances.
function SelfCertCard({scH1, scH2, scColor}) {
  const [open, setOpen] = useState(false);
  const totalUsed = scH1.length + scH2.length;
  return (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <TrafficDot color={scColor(Math.max(scH1.length,scH2.length))}/>
            <div>
              <p style={{color:TEXT,fontSize:15,fontWeight:700,margin:0}}>Self Cert</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>2 days per half-year · resets 1 Jan &amp; 1 Jul</p>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:TEXT,fontSize:18,fontWeight:800,margin:0}}>{totalUsed} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>used</span></p>
            <span style={{color:MUTED,fontSize:11,display:"block",marginTop:3}}>{open?"▲ hide":"▼ dates"}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{padding:"0 16px 14px",borderTop:`1px solid ${BORDER}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            {[{label:"Jan – Jun",items:scH1},{label:"Jul – Dec",items:scH2}].map(({label,items})=>(
              <div key={label} style={{background:CARD2,borderRadius:12,padding:"12px 14px",border:`1px solid ${scColor(items.length)}44`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <TrafficDot color={scColor(items.length)}/>
                  <p style={{color:TEXT,fontSize:13,fontWeight:700,margin:0}}>{label}</p>
                </div>
                <p style={{color:scColor(items.length),fontSize:22,fontWeight:800,margin:"0 0 1px"}}>{2-items.length} <span style={{color:MUTED,fontSize:12,fontWeight:400}}>left</span></p>
                <p style={{color:MUTED,fontSize:11,margin:0}}>{items.length} of 2 used</p>
                {items.length>0&&<div style={{marginTop:8,borderTop:`1px solid ${BORDER}`,paddingTop:6}}>
                  {items.map((d,i)=><p key={i} style={{color:MUTED,fontSize:12,margin:"2px 0"}}>{fmtDate(d.date)}</p>)}
                </div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LEAVE SCREEN ─────────────────────────────────────────────────────────────
const LEAVE_KEY = "dbus_leave";
function loadLeaveSettings() {
  try { const s=localStorage.getItem(LEAVE_KEY); return s?JSON.parse(s):{annualTotal:20}; } catch{return{annualTotal:20};}
}
function saveLeaveSettings(s) { try{localStorage.setItem(LEAVE_KEY,JSON.stringify(s));}catch{} }

function LeaveScreen({periods, leaveSettings, onLogDayOff}) {
  const year = new Date().getFullYear();
  const [editTotal, setEditTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(String(leaveSettings?.annualTotal||20));

  const allDaysOff = useMemo(() => {
    return periods.flatMap(p => (p.daysOff||[]).filter(d => d.date.startsWith(String(year))));
  }, [periods, year]);

  const annual = allDaysOff.filter(d=>d.type==="Annual Leave").sort((a,b)=>a.date.localeCompare(b.date));
  const sick   = allDaysOff.filter(d=>d.type==="Sick Day").sort((a,b)=>a.date.localeCompare(b.date));
  const scAll  = allDaysOff.filter(d=>d.type==="Self Cert").sort((a,b)=>a.date.localeCompare(b.date));
  const fm     = allDaysOff.filter(d=>d.type==="Force Majeure").sort((a,b)=>a.date.localeCompare(b.date));
  const scH1   = scAll.filter(d=>{ const m=parseInt(d.date.slice(5,7)); return m>=1&&m<=6; });
  const scH2   = scAll.filter(d=>{ const m=parseInt(d.date.slice(5,7)); return m>=7&&m<=12; });

  const annualUsed = annual.length;
  const annualTotal = leaveSettings.annualTotal;
  const annualRem = annualTotal - annualUsed;
  const annualColor = annualRem>=8?SUCCESS:annualRem>=4?"#F59E0B":DANGER;
  const sickColor = sick.length<=3?SUCCESS:sick.length<=7?"#F59E0B":DANGER;
  const scColor = n => n===0?SUCCESS:n===1?"#F59E0B":DANGER;

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      <div style={{padding:"28px 20px 16px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <p style={{color:ACCENT,fontSize:11,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 4px"}}>Calendar year {year}</p>
        <h1 style={{color:TEXT,fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.5px"}}>Leave Tracker</h1>
        <p style={{color:MUTED,fontSize:13,margin:0}}>Based on day-off entries logged in the app</p>
      </div>
      <div style={{padding:"4px 16px 0"}}>

        <button onClick={onLogDayOff} style={{...btnStyle,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07090F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Day Off
        </button>

        <LeaveCard title="Annual Leave" subtitle={`${annualTotal} days entitlement · Jan–Dec`}
          color={annualColor} used={annualUsed} total={annualTotal} remaining={annualRem}>
          <DayList items={annual} emptyMsg="No annual leave logged this year"/>
        </LeaveCard>

        <LeaveCard title="Sick Leave" subtitle="Certified by doctor · Jan–Dec"
          color={sickColor} used={sick.length}>
          <DayList items={sick} emptyMsg="No sick days logged this year"/>
        </LeaveCard>

        <SelfCertCard scH1={scH1} scH2={scH2} scColor={scColor}/>

        <LeaveCard title="Force Majeure" subtitle="No fixed limit · Jan–Dec"
          color={fm.length===0?MUTED:fm.length<=2?SUCCESS:"#F59E0B"} used={fm.length}>
          <DayList items={fm} emptyMsg="No force majeure logged this year"/>
        </LeaveCard>

      </div>
    </div>
  );
}


// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
const SETTINGS_KEY = "dbus_settings";
function loadSettings() {
  try { const s=localStorage.getItem(SETTINGS_KEY); return s?JSON.parse(s):{appearance:"system",defaultZone:"Zone 1"}; }
  catch { return {appearance:"system",defaultZone:"Zone 1"}; }
}
function saveSettings(s) { try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch{} }

function SettingsPanel({onClose, onThemeChange, leaveSettings, onLeaveSettingsChange, onReplayTour, onViewTerms}) {
  const [settings, setSettings] = useState(loadSettings);
  const [annualInput, setAnnualInput] = useState(String(leaveSettings?.annualTotal||20));
  const [annualError, setAnnualError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showReload, setShowReload] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const appearances = [{v:"system",l:"📱 System"},{v:"light",l:"☀️ Light"},{v:"dark",l:"🌙 Dark"}];

  useEffect(()=>{
    if(!toast) return;
    const t = setTimeout(()=>setToast(null), 4000);
    return ()=>clearTimeout(t);
  },[toast]);

  function checkScrollEnd(e) {
    const el = e.target;
    setScrolledToEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  }

  function setAppearance(val) {
    const next = {...settings, appearance:val};
    setSettings(next); saveSettings(next);
    onThemeChange(val);
  }
  function setZone(z) {
    const next = {...settings, defaultZone:z};
    setSettings(next); saveSettings(next);
    localStorage.setItem("dbus_last_zone", z);
  }
  function toggleNotifications() {
    if (settings.notificationsEnabled) {
      const next = {...settings, notificationsEnabled:false};
      setSettings(next); saveSettings(next);
      return;
    }
    if (typeof Notification === "undefined") { setToast("Notifications aren't supported in this browser."); return; }
    Notification.requestPermission().then(perm => {
      if (perm === "granted") {
        const next = {...settings, notificationsEnabled:true};
        setSettings(next); saveSettings(next);
        setToast("Reminders on.");
      } else {
        setToast("Notifications blocked — allow them for this site in your phone's settings to use reminders.");
      }
    });
  }
  function saveAnnual() {
    const n = parseInt(annualInput,10);
    if(isNaN(n) || n<1 || n>30) { setAnnualError("Enter a number between 1 and 30."); return; }
    setAnnualError(null);
    onLeaveSettingsChange({...(leaveSettings||{}), annualTotal:n});
    setToast("Annual leave entitlement saved.");
  }

  return (
    <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{position:"relative",background:CARD,borderRadius:"20px 20px 0 0",border:`1px solid ${BORDER}`,borderBottom:"none",maxHeight:"85vh"}} onClick={e=>e.stopPropagation()}>
      <div onScroll={checkScrollEnd} style={{padding:24,maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:TEXT,fontSize:20,fontWeight:800,margin:0}}>Settings</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:24,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
        </div>

        {toast && (
          <div style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:TEXT,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <span>{toast}</span>
            <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:MUTED,fontSize:16,cursor:"pointer",padding:0,lineHeight:1,flexShrink:0}}>×</button>
          </div>
        )}

        {/* Appearance */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Appearance</p>
        <div style={{marginBottom:8}}>
          <SegGroup options={appearances.map(a=>({v:a.v,l:a.l}))} value={settings.appearance} cols={3} onChange={setAppearance}/>
        </div>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 20px"}}>
          {settings.appearance==="system"?"Matches your phone's display setting.":settings.appearance==="light"?"Light mode — easier in bright daylight.":"Dark mode — easier in low light."}
        </p>

        {/* Default Zone */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Default zone</p>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Pre-selected when you open Lookup or Log a Shift.</p>
        <div style={{marginBottom:20}}>
          <SegGroup options={ZONES} value={settings.defaultZone} cols={4} onChange={setZone}/>
        </div>

        {/* Shift reminders */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Shift reminders</p>
        <div style={{...cardStyle,marginBottom:20,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={toggleNotifications}>
            <div>
              <p style={{color:TEXT,fontSize:14,fontWeight:600,margin:0}}>Notify me</p>
              <p style={{color:MUTED,fontSize:12,margin:"2px 0 0"}}>A nudge if today's shift isn't logged, or you're close to a limit — only while the app is open.</p>
            </div>
            <div style={{width:44,height:26,borderRadius:13,background:settings.notificationsEnabled?SUCCESS:BORDER,position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:settings.notificationsEnabled?21:3,transition:"left 0.2s"}}/>
            </div>
          </div>
        </div>

        {/* Annual Leave Entitlement */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Annual leave entitlement</p>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 10px"}}>Full-time drivers get 20 days. Adjust if you're part-time.</p>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:annualError?6:20}}>
          <input type="number" min="1" max="30" value={annualInput} onChange={e=>{setAnnualInput(e.target.value);setAnnualError(null);}}
            style={{...inputStyle,width:80,textAlign:"center",fontSize:18,fontWeight:700,padding:"10px 8px",...(annualError?{borderColor:DANGER}:{})}}/>
          <span style={{color:MUTED,fontSize:14}}>days</span>
          <button onClick={saveAnnual} style={{...btnStyle,width:"auto",padding:"10px 20px",fontSize:13,borderRadius:10,marginLeft:"auto"}}>Save</button>
        </div>
        {annualError && <p style={{color:DANGER,fontSize:12,margin:"0 0 20px"}}>{annualError}</p>}

        {/* Backup & Restore */}
        <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,margin:"0 0 10px"}}>Data backup</p>
        <p style={{color:MUTED,fontSize:12,margin:"0 0 12px"}}>Export your shifts and leave to a file. Import it on a new phone to restore everything.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:showReload?12:24}}>
          <button onClick={()=>{
            const res = runExportBackup();
            setToast(res.ok ? "Backup downloaded." : res.reason);
          }} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ⬇ Export backup
          </button>
          <button onClick={()=>{
            const inp = document.createElement("input");
            inp.type="file"; inp.accept=".json";
            inp.onchange=e=>{
              const file=e.target.files[0]; if(!file) return;
              const reader=new FileReader();
              reader.onload=ev=>{
                try {
                  const parsed=JSON.parse(ev.target.result);
                  if(!parsed.periods||!parsed.activePeriodId) throw new Error("Invalid");
                  setConfirmDialog({
                    msg:"This will replace all your current data with the backup. Continue?",
                    onYes:()=>{
                      try {
                        localStorage.setItem("dbus_v3",JSON.stringify(parsed));
                        setConfirmDialog(null);
                        setShowReload(true);
                        setToast("Restored — tap Reload to see your data.");
                      } catch { setConfirmDialog(null); setToast("Couldn't save the restored data — try again."); }
                    },
                    onNo:()=>setConfirmDialog(null)
                  });
                } catch{setToast("That file isn't a valid backup.");}
              };
              reader.readAsText(file);
            };
            inp.click();
          }} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ⬆ Import backup
          </button>
        </div>
        {showReload && (
          <button onClick={()=>window.location.reload()} style={{...btnStyle,marginBottom:24}}>
            Reload now
          </button>
        )}

        {/* Help & legal */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          <button onClick={onReplayTour} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ↻ Replay tour
          </button>
          <button onClick={onViewTerms} style={{background:CARD2,color:TEXT,border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 8px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Terms & Conditions
          </button>
        </div>

        {/* App Info */}
        <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{color:MUTED,fontSize:12,margin:"0 0 2px"}}>Dublin Bus Shift Tracker</p>
              <p style={{color:MUTED,fontSize:11,margin:0}}>Summerhill depot · 390 duties · 4 zones</p>
            </div>
            <span style={{background:CARD2,color:MUTED,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
      </div>
      {!scrolledToEnd && (
        <div style={{position:"absolute",left:0,right:0,bottom:0,height:28,background:`linear-gradient(180deg,transparent,${CARD})`,pointerEvents:"none"}}/>
      )}
      {confirmDialog && <ConfirmDialog msg={confirmDialog.msg} yesLabel="Restore" onYes={confirmDialog.onYes} onNo={confirmDialog.onNo}/>}
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function NavIcon({id, active}) {
  const c = active ? ACCENT : MUTED;
  const s = {width:22,height:22,fill:"none",stroke:c,strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"};
  if(id==="home") return <svg viewBox="0 0 24 24" style={s}><path d="M3 12L12 4l9 8"/><path d="M5 10v10h5v-5h4v5h5V10"/></svg>;
  if(id==="lookup") return <svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>;
  if(id==="log") return <svg viewBox="0 0 24 24" style={{...s,stroke:active?"#07090F":MUTED,fill:active?ACCENT:"none"}}><circle cx="12" cy="12" r="10" strokeWidth={active?0:1.8}/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg>;
  if(id==="period") return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>;
  if(id==="leave") return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M8 14h4m-4 4h8"/></svg>;
  if(id==="archive") return <svg viewBox="0 0 24 24" style={s}><path d="M3 7l1.5-4h15L21 7"/><rect x="3" y="7" width="18" height="14" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/></svg>;
  return null;
}

function BottomNav({active, onChange}) {
  const tabs=[
    {id:"home",label:"Home"},
    {id:"log",label:"Log"},
    {id:"lookup",label:"Lookup"},
    {id:"period",label:"Period"},
    {id:"leave",label:"Leave"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0A0E1A",borderTop:`1px solid ${BORDER}`,display:"grid",gridTemplateColumns:"repeat(5,1fr)",zIndex:100,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
      {tabs.map((t,i)=>{
        const isLookup = t.id==="lookup";
        const isActive = active===t.id;
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            background:"none",border:"none",cursor:"pointer",
            padding: isLookup ? "6px 0 14px" : "10px 0 14px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            position:"relative"
          }}>
            {isLookup ? (
              <div style={{
                background: isActive ? ACCENT : "#1A2438",
                borderRadius:14,padding:"10px 18px",
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                marginTop:-18,
                boxShadow: isActive ? `0 4px 20px ${ACCENT}44` : "none",
                border: isActive ? "none" : `1px solid ${BORDER}`,
                transition:"all 0.2s"
              }}>
                <NavIcon id="lookup" active={isActive}/>
                <span style={{fontSize:10,color:isActive?"#07090F":MUTED,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase"}}>Lookup</span>
              </div>
            ) : (
              <>
                {isActive && <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:ACCENT,borderRadius:"0 0 2px 2px"}}/>}
                <NavIcon id={t.id} active={isActive}/>
                <span style={{fontSize:10,color:isActive?ACCENT:MUTED,fontWeight:isActive?700:400,letterSpacing:"0.3px"}}>{t.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ConfirmDialog({msg,onYes,onNo,yesLabel,danger=true}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{...cardStyle,width:"100%",maxWidth:420,padding:24}}>
        <p style={{color:TEXT,textAlign:"center",margin:"0 0 20px",fontSize:16}}>{msg}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <button onClick={onNo} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"13px 0",fontSize:15,cursor:"pointer"}}>Cancel</button>
          <button onClick={onYes} style={{background:danger?DANGER:ACCENT,border:"none",color:danger?"#fff":"#07090F",borderRadius:10,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer"}}>{yesLabel||"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}



// ─── SEQUENCE LOOKUP ──────────────────────────────────────────────────────────
const ZONE_ABB={"Zone 1":"Z1","Zone 2":"Z2","Skerries":"SK","150":"R150"};
const DAY_ABB={"weekday":"W","saturday":"SA","sunday":"SU"};
function getSeq(zone, dayType, dutyId) {
  const z=ZONE_ABB[zone]||zone, d=DAY_ABB[dayType]||dayType;
  let n;
  if (/^\d+$/.test(dutyId)) {
    n = parseInt(dutyId.slice(-3));
  } else {
    // dutyId is a roster string e.g. "SZ1/01", "SZ2/1X", "1x" — NOT purely numeric,
    // so it must go through the offset lookup below rather than a truncated slice+parseInt,
    // which silently succeeds on strings like "SZ1/10X" (parseInt("10X")===10) and skips the offset
    const isX=/[Xx]/.test(dutyId);
    const m=dutyId.match(/(\d+)[Xx]?$/);
    if(!m) return [];
    const num=parseInt(m[1]);
    if(zone==="Zone 1")      n=isX?67+num:num;
    else if(zone==="Zone 2") n=isX?150+num:100+num;
    else if(zone==="150")    n=isX?270+num:250+num;
    else if(zone==="Skerries") n=isX?210+num:200+num;
    else n=num;
  }
  return SEQ[`${z}|${d}|${String(n).padStart(3,"0")}`]||[];
}
function parseEntry(e) {
  const m=e.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
  return m?{time:m[1],desc:m[2].trim()}:{time:"",desc:e};
}

// ─── DUTY LOOKUP SCREEN ───────────────────────────────────────────────────────
function DutyLookup({onLogShift}) {
  // Remember last used zone across sessions
  const savedZone = localStorage.getItem("dbus_last_zone") || "Zone 1";
  const [zone, setZone] = useState(savedZone);
  const [dayType, setDayType] = useState(getDayType(today()));
  const [rIdx, setRIdx] = useState(-1);
  const duties = useMemo(()=>getDuties(zone,dayType),[zone,dayType]);
  const duty = rIdx>=0 ? duties[rIdx] : null;
  const sequence = useMemo(()=> duty ? getSeq(duty.z, duty.t, duty.d2) : [], [duty]);
  const dayOpts=[{v:"weekday",l:"Mon–Fri"},{v:"saturday",l:"Saturday"},{v:"sunday",l:"Sunday"}];
  const spreadover = duty ? calcSpreadover(duty.s, duty.e) : 0;

  function handleZoneChange(z) {
    setZone(z); setRIdx(-1);
    localStorage.setItem("dbus_last_zone", z);
  }

  function dotColor(entry) {
    const e=entry.toLowerCase();
    if(e.includes("report")) return ACCENT;
    if(e.includes("(break)")||e.includes(" break)")||e.endsWith("break)")) return "#F59E0B";
    if(e.includes("finish")) return SUCCESS;
    if(e.includes("spl to")||e.includes("special to")||e.includes("refuel")) return MUTED;
    return "#60A5FA";
  }
  function routeBadge(desc) {
    const m = desc.match(/\((\d{1,3}[A-Z]?)\)/);
    return m ? m[1] : null;
  }
  function entryLabel(entry) {
    const e=entry.toLowerCase();
    if(e.includes("report")) return "REPORT";
    if(e.includes("(break)")||e.includes(" break)")||e.endsWith("break)")) return "BREAK";
    if(e.includes("finish")) return "FINISH";
    if(e.includes("spl to")||e.includes("special to")) return "SPECIAL";
    return null;
  }

  return (
    <div style={{background:BG,minHeight:"100vh",paddingBottom:100}}>
      {/* Header */}
      <div style={{padding:"24px 20px 20px",background:`linear-gradient(180deg,${CARD2} 0%,${BG} 100%)`}}>
        <p style={{color:MUTED,fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>Dublin Bus</p>
        <h1 style={{color:TEXT,fontSize:26,fontWeight:800,margin:0,letterSpacing:"-0.5px"}}>Duty Lookup</h1>
        <p style={{color:MUTED,fontSize:13,margin:"6px 0 0"}}>Select zone, day and duty to see your running board</p>
      </div>

      <div style={{padding:"0 16px"}}>
        {/* Zone selector */}
        <div style={{marginBottom:12}}>
          <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,margin:"0 0 8px"}}>Zone</p>
          <SegGroup options={ZONES} value={zone} cols={4} onChange={handleZoneChange}/>
        </div>

        {/* Day selector */}
        <div style={{marginBottom:12}}>
          <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,margin:"0 0 8px"}}>Day</p>
          <SegGroup options={dayOpts.map(o=>({v:o.v,l:o.l}))} value={dayType} cols={3}
            onChange={v=>{setDayType(v);setRIdx(-1);}}/>
        </div>

        {/* Duty selector */}
        <div style={{marginBottom:duty?20:0}}>
          <p style={{color:MUTED,fontSize:11,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,margin:"0 0 8px"}}>Duty <span style={{color:MUTED,fontWeight:400,textTransform:"none",letterSpacing:0}}>— {duties.length} available</span></p>
          <DutyPicker key={zone+dayType} duties={duties} value={rIdx} onChange={setRIdx}/>
        </div>

        {/* Empty state — guides the first-time flow */}
        {!duty && (
          <div style={{textAlign:"center",padding:"48px 24px 0"}}>
            <div style={{width:72,height:72,borderRadius:20,background:`${ACCENT}14`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
            </div>
            <p style={{color:TEXT,fontSize:16,fontWeight:700,margin:"0 0 6px"}}>Pick a duty to see the board</p>
            <p style={{color:MUTED,fontSize:14,lineHeight:1.6,margin:"0 auto",maxWidth:280}}>
              Got a duty from your BACMS text? Choose the zone and day above, then select the duty number — the full running board appears here.
            </p>
          </div>
        )}

        {/* Running board */}
        {duty && (
          <>
            {/* Duty summary strip */}
            <div style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:14,padding:"16px 18px",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{color:ACCENT,fontSize:24,fontWeight:800,letterSpacing:"-0.5px"}}>{duty.r}</span>
                <span style={{background:ACCENT+"22",color:ACCENT,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{dayOpts.find(o=>o.v===dayType)?.l}</span>
              </div>
              <p style={{color:MUTED,fontSize:13,margin:"0 0 12px"}}>{duty.z}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                <div style={{background:`${BG}88`,borderRadius:10,padding:"10px 12px"}}>
                  <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 3px"}}>Work</p>
                  <p style={{color:TEXT,fontSize:16,fontWeight:800,margin:0}}>{fmtHrs(duty.w)}</p>
                </div>
                <div style={{background:`${BG}88`,borderRadius:10,padding:"10px 12px"}}>
                  <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 3px"}}>Spread</p>
                  <p style={{color:ACCENT,fontSize:16,fontWeight:800,margin:0}}>{fmtHrs(spreadover)}</p>
                </div>
                <div style={{background:`${BG}88`,borderRadius:10,padding:"10px 12px"}}>
                  <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700,margin:"0 0 3px"}}>Relief</p>
                  <p style={{color:duty.l>0?TEXT:MUTED,fontSize:16,fontWeight:800,margin:0}}>{duty.l>0?fmtHrs(duty.l):"–"}</p>
                </div>
              </div>
            </div>

            {/* Running board timeline */}
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"20px 18px",marginBottom:16}}>
              <p style={{color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:2,fontWeight:700,margin:"0 0 18px"}}>Running Board</p>
              {sequence.length > 0 ? sequence.map((entry,i) => {
                const {time, desc} = parseEntry(entry);
                const dc = dotColor(entry);
                const badge = routeBadge(desc);
                const label = entryLabel(entry);
                const isLast = i===sequence.length-1;
                return (
                  <div key={i} style={{display:"flex",gap:14,position:"relative"}}>
                    {/* Timeline line */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:16}}>
                      <div style={{
                        width:10, height:10, borderRadius:"50%",
                        background:dc, flexShrink:0, marginTop:4,
                        boxShadow: `0 0 8px ${dc}66`
                      }}/>
                      {!isLast && <div style={{width:1,flex:1,background:BORDER,margin:"4px 0"}}/>}
                    </div>
                    {/* Content */}
                    <div style={{flex:1,paddingBottom:isLast?0:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{color:dc,fontSize:17,fontWeight:800,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.3px"}}>{time}</span>
                        {badge && <span style={{background:dc+"22",color:dc,borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:700}}>{badge}</span>}
                        {label && <span style={{color:MUTED,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{label}</span>}
                      </div>
                      <p style={{color:label==="FINISH"?SUCCESS:label==="BREAK"?"#F59E0B":label==="REPORT"?TEXT:TEXT,
                        fontSize:13,margin:"2px 0 0",lineHeight:1.4,opacity:0.85}}>{desc.replace(/\(\d{1,3}[A-Z]?\)/g,"").trim()}</p>
                    </div>
                  </div>
                );
              }) : <p style={{color:MUTED,fontSize:14,textAlign:"center",padding:"12px 0",margin:0}}>No running board available for this duty</p>}
            </div>

            {onLogShift && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button style={btnStyle} onClick={()=>onLogShift(duty, dayType, today())}>
                  Log for Today
                </button>
                <button style={{...btnStyle,background:"none",border:`1px solid ${ACCENT}`,color:ACCENT}} onClick={()=>onLogShift(duty, dayType, addDays(today(),1))}>
                  Log for Tomorrow
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ONBOARDING TOUR ──────────────────────────────────────────────────────────
function TourIcon({type}) {
  const wrap = {width:64,height:64,borderRadius:18,background:`${ACCENT}18`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"};
  const s = {width:30,height:30,fill:"none",stroke:ACCENT,strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"};
  if(type==="welcome") return <div style={wrap}><BusLogo size={36}/></div>;
  if(type==="log") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>;
  if(type==="lookup") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg></div>;
  if(type==="period") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg></div>;
  if(type==="limits") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 7v5l3 2"/></svg></div>;
  if(type==="pdf") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg></div>;
  if(type==="rest") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg></div>;
  if(type==="tally") return <div style={wrap}><svg viewBox="0 0 24 24" style={s}><line x1="5" y1="20" x2="5" y2="9"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="19" y1="20" x2="19" y2="13"/></svg></div>;
  return null;
}

const TOUR_SLIDES = [
  {
    icon: "welcome",
    title: "Welcome to\nShift Tracker",
    body: "Built for Dublin Bus drivers at Summerhill. Log shifts, track your 5-week hours, look up any duty — all on your phone."
  },
  {
    icon: "lookup",
    title: "Look Up Any Duty",
    body: "Tap Lookup, pick your zone, day and duty. You'll see the full running board — every trip, terminus, break and finish. Tap 'Log this Shift' to pre-fill the log screen in one tap."
  },
  {
    icon: "log",
    title: "Logging a Shift",
    body: "Tap Log a Shift, pick your zone and duty — report time, sign off, work and relief fill in automatically. Adjust anything that changed on the day. A partial shift? Just change the sign off time."
  },
  {
    icon: "rest",
    title: "Spare & Rest Day",
    body: "Covering a duty as a spare? Toggle 'Spare driver shift' and enter your times manually. Working on a rest day? Toggle 'Working on a rest day' — those hours won't count toward your 190h limit."
  },
  {
    icon: "limits",
    title: "Overtime Tracking",
    body: "Log extra hours worked on top of any shift — add the time and a free text note. Overtime is tracked separately and won't affect your compliance total."
  },
  {
    icon: "period",
    title: "Your 5-Week Period",
    body: "Everything is tracked across a 5-week period starting on a Sunday. The home screen shows your remaining hours at a glance. Tap Period for a full week-by-week breakdown."
  },
  {
    icon: "tally",
    title: "Three Limits Tracked",
    body: "Total hours (190h 4m), Sunday hours (14h 30m), and Overtime are all tracked separately. Bars turn amber as you approach a limit, red if you exceed it."
  },
  {
    icon: "pdf",
    title: "Export a Record",
    body: "Tap Export PDF on the Period screen for a full professional record — every shift, compliance figures, and overtime notes — ready to share with a union rep or manager."
  }
];

function TourOverlay({onDone}) {
  const [slide, setSlide] = useState(0);
  const s = TOUR_SLIDES[slide];
  const isLast = slide === TOUR_SLIDES.length - 1;

  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:300,padding:"0 16px 32px"}}>
      <div style={{width:"100%",maxWidth:420,background:CARD,borderRadius:24,padding:28,border:`1px solid ${BORDER}`}}>

        {/* Slide counter dots + step number */}
        <p style={{color:MUTED,fontSize:12,textAlign:"center",margin:"0 0 10px",fontWeight:600}}>Step {slide+1} of {TOUR_SLIDES.length}</p>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:28}}>
          {TOUR_SLIDES.map((_,i) => (
            <div key={i} style={{
              width:22, height:6, borderRadius:3, transformOrigin:"left center",
              transform: i===slide ? "scaleX(1)" : "scaleX(0.27)",
              background: i===slide ? ACCENT : BORDER,
              transition:"transform 0.3s, background 0.3s"
            }}/>
          ))}
        </div>

        {/* Content */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{marginBottom:20}}><TourIcon type={s.icon}/></div>
          <h2 style={{color:TEXT,fontSize:23,fontWeight:800,margin:"0 0 12px",lineHeight:1.2,whiteSpace:"pre-line",letterSpacing:"-0.5px"}}>{s.title}</h2>
          <p style={{color:MUTED,fontSize:15,lineHeight:1.6,margin:0}}>{s.body}</p>
        </div>

        {/* Buttons */}
        <div style={{display:"grid",gridTemplateColumns: slide===0 ? "1fr" : "auto 1fr",gap:12}}>
          {slide > 0 && (
            <button onClick={()=>setSlide(slide-1)} style={{background:"none",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:12,padding:"15px 20px",fontSize:18,cursor:"pointer",lineHeight:1}}>←</button>
          )}
          <button onClick={()=> isLast ? onDone() : setSlide(slide+1)} style={btnStyle}>
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={onDone} style={{background:"none",border:"none",color:MUTED,fontSize:13,cursor:"pointer",width:"100%",marginTop:16,padding:"4px 0"}}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editShift, setEditShift] = useState(null);
  const [editDayOff, setEditDayOff] = useState(null);
  const [archiveViewId, setArchiveViewId] = useState(null);
  const [openWeek, setOpenWeek] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [lookupDuty, setLookupDuty] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [themeKey, setThemeKey] = useState(0);
  const [leaveSettings, setLeaveSettings] = useState(loadLeaveSettings);
  const [dayOffFrom, setDayOffFrom] = useState("home"); // tracks where to return after logging day off
  const [viewingTerms, setViewingTerms] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadCorrupted, setLoadCorrupted] = useState(false);
  const [rosterVersion, setRosterVersion] = useState(0);
  const [logInitDate, setLogInitDate] = useState(null);
  const [logInitRestDay, setLogInitRestDay] = useState(false);

  const activePeriod = periods.find(p=>p.id===activePeriodId);

  useEffect(()=>{
    // Request persistent storage so browser doesn't evict data under pressure
    if(navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(()=>{});
    }
    // Apply saved theme on load
    const s = loadSettings();
    applyTheme(s.appearance, null);
    // Fetches fresher duty/running-board/rest-day data in the background so a
    // roster update can go live without an app rebuild — never blocks first
    // render; if it resolves after the user's already looking at a screen,
    // bumping rosterVersion forces the whole tree to re-render with it.
    loadRosterData().then(remote => {
      if(remote) {
        DUTIES = remote.duties;
        SEQ = remote.seq;
        FIXED_REST_PATTERN = remote.fixedRestPattern;
        setRosterVersion(v => v+1);
      }
    });
    loadData().then(({data,corrupted})=>{
      if(corrupted) { setLoadCorrupted(true); setLoading(false); return; }
      if(data){setPeriods(data.periods||[]);setActivePeriodId(data.activePeriodId||null);}
      const terms = localStorage.getItem("dbus_terms");
      if(!terms) { setTermsAccepted(false); setLoading(false); return; }
      const seenVersion = localStorage.getItem("dbus_version");
      const isNewInstall = !seenVersion;
      if(seenVersion !== APP_VERSION && (isNewInstall || WHATS_NEW.showToExisting)) setShowWhatsNew(true);
      const toured = localStorage.getItem("dbus_toured");
      if(!toured) setShowTour(true);
      setLoading(false);
    });
  },[]);

  function handleThemeChange(appearance) {
    applyTheme(appearance, ()=>setThemeKey(k=>k+1));
  }

  function handleLeaveSettingsChange(s) {
    setLeaveSettings(s);
    saveLeaveSettings(s);
  }

  function acceptTerms() {
    localStorage.setItem("dbus_terms","1");
    setTermsAccepted(true);
    const seenVersion = localStorage.getItem("dbus_version");
    const isNewInstall = !seenVersion;
    if(seenVersion !== APP_VERSION && (isNewInstall || WHATS_NEW.showToExisting)) setShowWhatsNew(true);
    const toured = localStorage.getItem("dbus_toured");
    if(!toured) setShowTour(true);
  }

  function dismissWhatsNew() {
    localStorage.setItem("dbus_version", APP_VERSION);
    setShowWhatsNew(false);
    // Only force the full tour for drivers who've genuinely never seen it —
    // returning users on a routine update shouldn't be walked through it again.
    if(!localStorage.getItem("dbus_toured")) setShowTour(true);
  }

  function skipTourFromWhatsNew() {
    localStorage.setItem("dbus_toured","1");
    dismissWhatsNew();
  }

  function dismissTour() {
    localStorage.setItem("dbus_toured","1");
    setShowTour(false);
  }

  const persist=(ps,aid)=>{
    setPeriods(ps);setActivePeriodId(aid);
    saveData({periods:ps,activePeriodId:aid}).then(ok=>setSaveError(!ok));
  };

  function createPeriod(startDate) {
    const p={id:uid(),startDate,shifts:[],daysOff:[],createdAt:new Date().toISOString()};
    persist([...periods,p],p.id); setScreen("home");
  }

  function saveShift(shiftOrArray) {
    const items = Array.isArray(shiftOrArray) ? shiftOrArray : [shiftOrArray];
    const updated=periods.map(p=>{
      if(p.id!==activePeriodId)return p;
      let shifts = p.shifts;
      items.forEach(shift=>{
        const ei=shifts.findIndex(s=>s.id===shift.id);
        if (ei>=0) { shifts = shifts.map(s=>s.id===shift.id?shift:s); return; }
        // New shift (multi-day path): skip if some other shift already owns this date -
        // the day-circle picker greys out already-logged days, but this guards a race
        // (e.g. another device/tab logged something in between) the same way the old
        // standalone Repeat screen's own dedup used to.
        if (shifts.some(s=>s.date===shift.date)) return;
        shifts = [...shifts, shift];
      });
      return{...p,shifts};
    });
    persist(updated,activePeriodId); setEditShift(null); setLookupDuty(null); setLogInitDate(null); setLogInitRestDay(false); setScreen("home");
  }

  function saveDayOff(dayOffOrArray) {
    // Find which period a date belongs to (or use active period as fallback)
    function findPeriodId(date) {
      const match = periods.find(p => inPeriod(date, p));
      return match ? match.id : activePeriodId;
    }
    const items = Array.isArray(dayOffOrArray) ? dayOffOrArray : [dayOffOrArray];
    // Group items by target period
    let updated = [...periods];
    items.forEach(dayOff => {
      const targetId = dayOff.id && periods.some(p=>(p.daysOff||[]).some(d=>d.id===dayOff.id))
        ? periods.find(p=>(p.daysOff||[]).some(d=>d.id===dayOff.id))?.id
        : findPeriodId(dayOff.date);
      updated = updated.map(p => {
        if(p.id !== targetId) return p;
        const daysOff = p.daysOff||[];
        const ei = daysOff.findIndex(d=>d.id===dayOff.id);
        const newDaysOff = ei>=0 ? daysOff.map(d=>d.id===dayOff.id?dayOff:d) : [...daysOff,dayOff];
        return {...p, daysOff:newDaysOff};
      });
    });
    persist(updated, activePeriodId);
    setEditDayOff(null);
    setScreen(dayOffFrom === "leave" ? "leave" : "period");
  }

  function deleteShift(sid) {
    setConfirm({msg:"Delete this shift? This can't be undone.",yesLabel:"Delete",onYes:()=>{
      const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,shifts:p.shifts.filter(s=>s.id!==sid)});
      persist(updated,activePeriodId); setConfirm(null);
    }});
  }

  function deleteDayOff(did) {
    if (did.startsWith("fixed-")) {
      const date = did.slice(6);
      setConfirm({msg:"Stop treating this date as an automatic rest day? If you're resting on a different day instead, log that separately.",yesLabel:"Stop",onYes:()=>{
        const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,removedFixedRestDates:[...(p.removedFixedRestDates||[]),date]});
        persist(updated,activePeriodId); setConfirm(null);
      }});
      return;
    }
    setConfirm({msg:"Remove this day off record?",yesLabel:"Remove",onYes:()=>{
      const updated=periods.map(p=>p.id!==activePeriodId?p:{...p,daysOff:(p.daysOff||[]).filter(d=>d.id!==did)});
      persist(updated,activePeriodId); setConfirm(null);
    }});
  }

  function startNewPeriod() {
    const currentEnd = addDays(activePeriod.startDate,34);
    const nextStart = addDays(activePeriod.startDate,35);
    setConfirm({
      msg:`Start a new 5-week period beginning ${fmtShort(nextStart)}? The period ending ${fmtShort(currentEnd)} will be archived.`,
      yesLabel:"Start New Period", danger:false,
      onYes:()=>{
        const np={id:uid(),startDate:nextStart,shifts:[],daysOff:[],createdAt:new Date().toISOString()};
        const updated=periods.map(p=>p.id===activePeriodId?{...p,archived:true}:p);
        persist([...updated,np],np.id); setConfirm(null); setArchiveViewId(null); setScreen("home");
      }
    });
  }

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG}}><div style={{animation:"pulse 1.4s ease-in-out infinite"}}><BusLogo size={56}/></div><style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style></div>;
  if(loadCorrupted) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:BG,padding:24,textAlign:"center"}}>
      <div style={{marginBottom:20}}><BusLogo size={56}/></div>
      <p style={{color:TEXT,fontSize:17,fontWeight:700,margin:"0 0 10px"}}>We couldn't read your saved data</p>
      <p style={{color:MUTED,fontSize:14,margin:"0 0 24px",maxWidth:320,lineHeight:1.6}}>The data stored on this device looks damaged and can't be opened. If you have an exported backup file, you can restore it from Settings after continuing.</p>
      <button onClick={()=>{setLoadCorrupted(false);setLoading(false);}} style={{...btnStyle,maxWidth:280}}>Continue</button>
    </div>
  );
  if(!termsAccepted) return <TermsScreen onAccept={acceptTerms}/>;
  if(showWhatsNew) return <WhatsNewScreen onDone={dismissWhatsNew} onSkipTour={skipTourFromWhatsNew}/>;
  if(!activePeriodId||!activePeriod) return <SetupScreen onCreate={createPeriod}/>;

  const archivePeriod=periods.find(p=>p.id===archiveViewId);

  if(screen==="log") return <LogScreen period={activePeriod} editShift={editShift} lookupDuty={lookupDuty} initialDate={logInitDate} initialRestDay={logInitRestDay}
    onSave={saveShift} onCancel={()=>{setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setScreen(editShift?"period":lookupDuty?"lookup":"home");}}/>;

  if(screen==="dayoff") return <LogDayOffScreen periods={periods} editDayOff={editDayOff}
    onSave={saveDayOff} onCancel={()=>{setEditDayOff(null);setScreen(editDayOff?"period":dayOffFrom);}}/>;

  if(screen==="archive"&&archiveViewId&&archivePeriod) return (
    <div style={{background:BG,minHeight:"100vh"}}>
      <div style={{padding:"20px 16px 0"}}>
        <button onClick={()=>setArchiveViewId(null)} style={{background:"none",border:"none",color:ACCENT,fontSize:20,cursor:"pointer"}}>← Back</button>
      </div>
      <PeriodScreen period={archivePeriod} onEdit={()=>{}} onDelete={()=>{}} onEditDayOff={()=>{}} onDeleteDayOff={()=>{}} readOnly/>
    </div>
  );

  return (
    <div style={{background:BG,minHeight:"100vh"}}>
      {screen==="lookup"&&<DutyLookup onLogShift={(d,dt,date)=>{setLookupDuty({d,dt,date});setScreen("log");}}/>}
      {screen==="home"&&<HomeScreen period={activePeriod} periods={periods}
        onLog={()=>{setEditShift(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}}
        onLogDate={(date,opts)=>{setEditShift(null);setLookupDuty(null);setLogInitDate(date);setLogInitRestDay(!!opts?.isRestDay);setScreen("log");}}
        onGoWeek={i=>{setOpenWeek(i);setScreen("period");}}
        onHelp={()=>setShowTour(true)}
        onThemeChange={handleThemeChange}
        leaveSettings={leaveSettings}
        onLeaveSettingsChange={handleLeaveSettingsChange}
        onViewTerms={()=>setViewingTerms(true)}/>}
      {screen==="period"&&<PeriodScreen period={activePeriod} initWeek={openWeek}
        onEdit={s=>{setEditShift(s);setScreen("log");}}
        onDelete={deleteShift}
        onEditDayOff={d=>{setEditDayOff(d);setDayOffFrom("period");setScreen("dayoff");}}
        onDeleteDayOff={deleteDayOff}
        onViewArchive={()=>setScreen("archive")}
        onEndPeriod={startNewPeriod}/>}
      {screen==="leave"&&<LeaveScreen periods={periods} leaveSettings={leaveSettings} onLogDayOff={()=>{setEditDayOff(null);setDayOffFrom("leave");setScreen("dayoff");}}/>}
      {screen==="archive"&&<ArchiveScreen periods={periods} activePeriodId={activePeriodId}
        onStartNew={startNewPeriod} onView={id=>setArchiveViewId(id)}/>}
      <BottomNav active={screen==="log"?"log":["archive"].includes(screen)?"leave":screen} onChange={tab=>{
        if(tab==="log"){setEditShift(null);setLookupDuty(null);setLogInitDate(null);setLogInitRestDay(false);setScreen("log");}
        else{
          if(tab==="period")setOpenWeek(null);
          setScreen(tab);
        }
      }}/>
      {confirm&&<ConfirmDialog msg={confirm.msg} yesLabel={confirm.yesLabel} danger={confirm.danger!==false} onYes={confirm.onYes} onNo={()=>setConfirm(null)}/>}
      {showTour&&<TourOverlay onDone={dismissTour}/>}
      {viewingTerms && (
        <div style={{position:"fixed",inset:0,zIndex:250,background:BG}}>
          <TermsScreen readOnly onClose={()=>setViewingTerms(false)}/>
        </div>
      )}
      {saveError && (
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:400,background:DANGER,color:"#fff",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,paddingTop:"calc(12px + env(safe-area-inset-top,0px))"}}>
          <span style={{fontSize:13,fontWeight:600,flex:1}}>Couldn't save — your last change may not have stuck.</span>
          <button onClick={()=>persist(periods,activePeriodId)} style={{background:"#fff",color:DANGER,border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0}}>Try again</button>
          <button onClick={()=>setSaveError(false)} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
        </div>
      )}
    </div>
  );
}
