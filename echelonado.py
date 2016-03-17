import tornado.ioloop
import tornado.web
import tornado.httpserver
import requests


class MainHandler(tornado.web.RequestHandler):

    def get(self):
        self.write("Hello, world")


class SpotifyAuth(tornado.web.RequestHandler):

    def set_default_headers(self):
        if self.request.headers.get('Referer') == 'http://localhost:9000/':
            self.set_header("Access-Control-Allow-Origin",
                            "http://localhost:9000")
        else:
            self.set_header("Access-Control-Allow-Origin",
                            "https://echelonapp.io")

    def get(self):
        self.write(
            "This api endpoint is meant to be accessed using a post request")

    def post(self):
        data_json = tornado.escape.json_decode(self.request.body)
        r = requests.get("https://api.spotify.com/v1/me",
                         headers={"Authorization": "Bearer " + data_json['access_token']})
        jr = r.json()
        # print(data_json['uid'],"  \n",jr['id']+"_spotify")
        if ('error' in jr) or ((jr['id'] + "_spotify") != data_json['uid']):
            self.write("The provided Spotify Access Token is not valid")
            # self.write(jr)
        else:
            del data_json['access_token']
            from firebase_token_generator import create_token
            token = create_token(
                "q9c97DmraH5bmjsndLBSC01YrDDmYxAiDfAyRMNs", data_json)
            self.write(token)

handlers = [
    (r"/", MainHandler),
    (r"/spotify-auth/", SpotifyAuth),
]

settings = dict(
    ssl_options={
        "certfile": "/etc/nginx/ssl/ssl-unified.crt",
        "keyfile": "/etc/nginx/ssl/ssl.key"
    }
)

if __name__ == "__main__":
    http_server = tornado.httpserver.HTTPServer(
        tornado.web.Application(handlers), **settings)
    http_server.listen(8081)
    tornado.ioloop.IOLoop.instance().start()
