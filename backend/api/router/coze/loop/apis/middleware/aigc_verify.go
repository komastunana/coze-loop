package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/cloudwego/hertz/pkg/app"
)

// User 结构体，和 session.User 类似
type User struct {
    ID    string `json:"user_id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// TokenResponse 解析网关返回 JSON
type TokenResponse struct {
    Code int  `json:"code"`
    Data User `json:"data"`
}

// TokenAuthMW 中间件
func TokenAuthMW() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        path := string(c.Path())
        // 可选：登录/注册/重置密码接口无需 token
        if path == "/login" || path == "/register" || path == "/reset_password" {
            c.Next(ctx)
            return
        }

        // 从 header 获取 token
        userToken := string(c.Request.Header.Peek("x-user-token"))
        if userToken == "" {
            c.JSON(http.StatusUnauthorized, map[string]string{"error": "x-user-token is Empty"})
            c.Abort()
            return
        }

        // 获取网关 base url
        baseURL := string(c.Request.Header.Peek("X-Forwarded-Gateway"))
        if baseURL == "" {
            baseURL = "http://aigc-paas-gateway.develop.zoomlion.com"
        }
        url := fmt.Sprintf("%s/api/current_user", baseURL)

        // 请求网关接口获取用户信息
        req, _ := http.NewRequest("GET", url, nil)
        req.Header.Set("x-user-token", userToken)
        client := &http.Client{}
        resp, err := client.Do(req)
        if err != nil {
            c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
            c.Abort()
            return
        }
        defer resp.Body.Close()

        body, _ := ioutil.ReadAll(resp.Body)
        if resp.StatusCode != http.StatusOK {
            c.JSON(http.StatusUnauthorized, map[string]string{"error": string(body)})
            c.Abort()
            return
        }

        var tr TokenResponse
        if err := json.Unmarshal(body, &tr); err != nil {
            c.JSON(http.StatusInternalServerError, map[string]string{"error": "invalid response"})
            c.Abort()
            return
        }

        if tr.Code != 200 {
            c.JSON(http.StatusUnauthorized, map[string]string{"error": "get current user failed"})
            c.Abort()
            return
        }

        // 把用户信息放入 context
        ctx = context.WithValue(ctx, "current_user", &tr.Data)
        c.Next(ctx)
    }
}
