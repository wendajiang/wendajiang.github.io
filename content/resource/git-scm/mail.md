---
title: Email Commands
date: 2026-07-03
tags:
  - git
---
# Email

Many Git projects, including Git itself, are entirely maintained over mailing lists. Git has a number of tools built into it that help make this process easier, from generating patches you can easily email to applying those patches from an email box.

## git apply
`git apply` command applies a patch created with `git diff` or even GNU diff command. 

## git am
`git am` command is used to apply patches from an email inbox, specifically one that is mbox formatted. This is useful for receiving patches over email and applying them to your project easily.

## git format-patch
`git format-path` command is used to generate a series of patches in mbox format that you can use to send to amailing list properly formatted.

## git imap-send
`git imap-send` command uploads a mailbox generated with `git format-path` into an IMAP drafts folder.

## git send-email
`git send-email` command is used to send patches that are generated with `git format-patch` over email.

```shell
# config your name and email
git config --global user.name "你的名字" 
git config --global user.email "你的163邮箱地址" 

# 配置 SMTP 服务器和端口（推荐使用 SSL 加密） 
git config --global sendemail.smtpserver smtp.163.com 
git config --global sendemail.smtpserverport 465 
git config --global sendemail.smtpencryption ssl 

# 配置发件人账号与授权码（注意：此处非 163 登录密码，需在 163 邮箱开启客户端授权密码） 
git config --global sendemail.smtpuser "你的163邮箱地址" 
git config --global sendemail.smtppass "你的163授权码"
```
## git request-pull
`git request-pull` command is simply used to generate an example message body to email to someone.